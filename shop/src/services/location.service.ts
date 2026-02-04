export const locationService = {
  getProvinces: async () => {
    const res = await fetch(
      "https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=100",
    );
    const json = await res.json();
    return Array.isArray(json?.provincias) ? json.provincias : [];
  },
  getLocalities: async (provinceId: string) => {
    const res = await fetch(
      `https://apis.datos.gob.ar/georef/api/municipios?provincia=${encodeURIComponent(
        provinceId,
      )}&campos=id,nombre&max=500`,
    );
    const json = await res.json();
    return Array.isArray(json?.municipios) ? json.municipios : [];
  },
};
