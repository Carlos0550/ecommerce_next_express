'use client'
import { useAppContext } from "@/providers/AppContext";
import { useState, useEffect, useCallback } from "react";
import useBankInfo from "@/Api/useBankInfo";
import { CheckoutFormValues } from "@/providers/useCart";

export default function useCart(onClose: () => void) {
    const {
        cart: { cart, clearCart, updateQuantity, formValues, setFormValues, processOrder, validatePromoCode, applyPromoCode, removePromoCode },
        auth,
        utils,
    } = useAppContext();

    const shippingInfoCompleted = (() => {
        if (!formValues.pickup) {
            return !(!formValues.name || !formValues.email || !formValues.phone || !formValues.street || !formValues.postal_code || !formValues.city || !formValues.province || !formValues.selectedProvinceId || !formValues.selectedLocalityId);
        } else {
            return !(!formValues.name || !formValues.email || !formValues.phone);
        }
    })();
    const [provinces, setProvinces] = useState<{ id: string; nombre: string }[]>([]);
    const [localities, setLocalities] = useState<{ id: string; nombre: string }[]>([]);
    const [processingOrder, setProcessingOrder] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    const { data: businessData, isLoading: isLoadingBankInfo, error: bankInfoError } = useBankInfo();

    const initShipping = useCallback(() => {
        const raw = localStorage.getItem('shipping_info') || '{}';
        if (!raw) return;
        
        const s = JSON.parse(raw);
        setFormValues((prev): CheckoutFormValues => {
            let nextValues = {
                ...prev,
                pickup: !!s.pickup,
                name: s.name || '',
                email: s.email || '',
                phone: s.phone || '',
                street: s.street || '',
                postal_code: s.postal_code || '',
                city: s.city || '',
                province: s.province || '',
                selectedProvinceId: '',
                selectedLocalityId: '',
                orderMethod: s.pickup ? 'EN_LOCAL' : 'TRANSFERENCIA',
                activeStep: 0,
                checkoutOpen: true,
            };

            if (auth?.state?.user) {
                const u = auth.state.user;
                if (!s.name || !s.email) {
                    nextValues = { 
                        ...nextValues, 
                        name: nextValues.name || (u.name || ''), 
                        email: nextValues.email || (u.email || '') 
                    };
                }
            }
            return nextValues as CheckoutFormValues;
        });
    }, [auth, setFormValues]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=100');
                const json = await res.json().catch(() => null);
                const list = Array.isArray(json?.provincias) ? json.provincias : [];
                setProvinces(list);
            } catch { }
        })();
    }, []);

    const handleProvinceChange = async (provId: string) => {
        setFormValues({ 
            ...formValues, 
            selectedProvinceId: provId, 
            province: (provinces.find((x) => x.id === provId)?.nombre || ''), 
            selectedLocalityId: '', 
            city: '' 
        });
        setLocalities([]);
        try {
            const res = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${encodeURIComponent(provId)}&campos=id,nombre&max=500`);
            const json = await res.json().catch(() => null);
            const list = Array.isArray(json?.municipios) ? json.municipios : [];
            setLocalities(list);
        } catch { }
    };

    const handleLocalityChange = (locId: string) => {
        const l = localities.find((x) => x.id === locId);
        setFormValues({ ...formValues, selectedLocalityId: locId, city: l?.nombre || '' });
    };

    const submitOrder = async () => {
        setProcessingOrder(true);
        const rs = await processOrder(utils.baseUrl, auth.state.token);
        if (rs.ok) {
            if (formValues.orderMethod === 'TRANSFERENCIA' && receiptFile && rs.order_id) {
                try {
                    const fd = new FormData();
                    fd.append('file', receiptFile);
                    
                    const headers = utils.getTenantHeaders();
                    delete headers['Content-Type']; // FormData sets its own boundary
                    if (auth?.state?.token) {
                        headers['Authorization'] = `Bearer ${auth.state.token}`;
                    }

                    const up = await fetch(`${utils.baseUrl}/orders/${rs.order_id}/receipt`, { method: 'POST', headers, body: fd });
                    const j = await up.json().catch(() => null);
                    if (!up.ok || !j?.ok) {
                        alert('La orden fue creada, pero el comprobante no se pudo subir.');
                    }
                } catch { }
            }
            setProcessingOrder(false);
            onClose();
        }
        setProcessingOrder(false);
    };

    return {
        cart,
        clearCart,
        updateQuantity,
        formValues,
        setFormValues,
        shippingInfoCompleted,
        initShipping,
        provinces,
        localities,
        handleProvinceChange,
        handleLocalityChange,
        submitOrder,
        processingOrder,
        receiptFile,
        setReceiptFile,
        businessData,
        isLoadingBankInfo,
        bankInfoError,
        validatePromoCode,
        applyPromoCode,
        removePromoCode
    };
}
