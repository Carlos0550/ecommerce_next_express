import { useEffect, useState, useCallback } from "react";
import { useCreateBusiness, useGetBusiness, useUpdateBusiness, useGenerateDescription, useUploadBusinessImage, type BusinessData } from "@/components/Api/BusinessApi";
import { notifications } from "@mantine/notifications";

export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  type?: string;
  description?: string;
  slug?: string;
  bankData?: {
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
  }[];
}

const INITIAL_STATE: BusinessData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  type: "",
  description: "",
  business_image: "",
  favicon: "",
  slug: "",
  bankData: [{ bank_name: "", account_number: "", account_holder: "" }]
};

export function useBusinessForm() {
  const { data, isPending: isLoadingData } = useGetBusiness();
  const createMutation = useCreateBusiness();
  const updateMutation = useUpdateBusiness();
  const generateDescriptionMutation = useGenerateDescription();
  const uploadImageMutation = useUploadBusinessImage();

  const [form, setForm] = useState<BusinessData>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        type: (data as any)?.type || "",
        description: data.description || "",
        business_image: data.business_image || "",
        favicon: data.favicon || "",
        slug: (data as any)?.tenant?.slug || (data as any)?.slug || "", 
        bankData: Array.isArray(data.bankData) && data.bankData.length 
          ? data.bankData 
          : [{ bank_name: "", account_number: "", account_holder: "" }]
      });
    }
  }, [data]);

  const validate = useCallback((data: BusinessData): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!data.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
      isValid = false;
    }

    if (!data.slug?.trim()) {
        newErrors.slug = "El slug es obligatorio";
        isValid = false;
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
        newErrors.slug = "El slug solo puede contener letras minúsculas, números y guiones";
        isValid = false;
    }

    if (!data.email.trim()) {
      newErrors.email = "El email es obligatorio";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    if (!data.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio";
      isValid = false;
    }

    const bankErrors = data.bankData.map(bank => {
      const bankError: { bank_name?: string; account_number?: string; account_holder?: string } = {};
      let hasBankError = false;

      const isPartiallyFilled = bank.bank_name || bank.account_number || bank.account_holder;
      
      if (isPartiallyFilled) {
        if (!bank.bank_name) {
          bankError.bank_name = "Nombre del banco requerido";
          hasBankError = true;
        }
        if (!bank.account_number) {
          bankError.account_number = "Número de cuenta requerido";
          hasBankError = true;
        }
        if (!bank.account_holder) {
          bankError.account_holder = "Titular requerido";
          hasBankError = true;
        }
      }
      
      return hasBankError ? bankError : {};
    });

    if (bankErrors.some(e => Object.keys(e).length > 0)) {
        newErrors.bankData = bankErrors;
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, []);

  const handleChange = useCallback((key: keyof BusinessData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  }, [errors]);

  const handleBankChange = useCallback((idx: number, key: keyof BusinessData["bankData"][number], value: string) => {
    setForm(prev => ({
      ...prev,
      bankData: prev.bankData.map((b, i) => i === idx ? { ...b, [key]: value } : b)
    }));
  }, []);

  const addBankAccount = useCallback(() => {
    setForm(prev => ({
      ...prev,
      bankData: [...prev.bankData, { bank_name: "", account_number: "", account_holder: "" }]
    }));
  }, []);

  const removeBankAccount = useCallback((idx: number) => {
     setForm(prev => ({
      ...prev,
      bankData: prev.bankData.filter((_, i) => i !== idx)
    }));
  }, []);

  const handleGenerateDescription = async () => {
    if (!form.name || !form.city || !form.state) {
      notifications.show({ message: "Nombre, Ciudad y Provincia son requeridos para generar descripción", color: "yellow" });
      return;
    }
    const description = await generateDescriptionMutation.mutateAsync({ name: form.name, city: form.city, province: form.state, type: form.type, actualDescription: form.description });
    handleChange("description", description);
  };

  const handleImageUpload = async (file: File | null, type: 'business_image' | 'favicon') => {
    if (!file) return;
    
    if (type === 'business_image') setIsUploadingImage(true);
    else setIsUploadingFavicon(true);

    try {
        const url = await uploadImageMutation.mutateAsync({ file, field: type, id: form.id });
        handleChange(type, url);
    } catch (error) {
        console.error(error);
    } finally {
        if (type === 'business_image') setIsUploadingImage(false);
        else setIsUploadingFavicon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(form)) {
        notifications.show({ message: "Por favor corrija los errores", color: "red" });
        return;
    }

    setIsSubmitting(true);
    try {
      if (form.id) {
        await updateMutation.mutateAsync({ id: form.id, payload: form });
      } else {
        await createMutation.mutateAsync(form);
      }
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message.includes("slug")) {
          setErrors(prev => ({ ...prev, slug: error.message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseBusinessName = () => {
    if (form.name) {
      const slug = form.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      handleChange("slug", slug);
    }
  };

  const suggestSlugWithAI = async () => {
    if (!form.name || !form.type) return;
    try {
        const res = await generateDescriptionMutation.mutateAsync({ 
            name: form.name, 
            city: form.city, 
            province: form.state, 
            type: form.type, 
            actualDescription: `Suggest a short, unique, and catchy URL slug for a business named "${form.name}" of type "${form.type}". Return ONLY the slug, nothing else. Lowercase, dashes instead of spaces.` 
        });
        const suggestedSlug = res.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        handleChange("slug", suggestedSlug);
    } catch (e) {
        console.error(e);
    }
  };

  return {
    form,
    errors,
    isLoading: isLoadingData,
    isSubmitting: isSubmitting || createMutation.isPending || updateMutation.isPending,
    handleChange,
    handleBankChange,
    addBankAccount,
    removeBankAccount,
    handleSubmit,
    handleGenerateDescription,
    isGeneratingDescription: generateDescriptionMutation.isPending,
    handleImageUpload,
    isUploadingImage,
    isUploadingFavicon,
    handleUseBusinessName,
    suggestSlugWithAI
  };
}
