/**
 * Extracts the Brazilian state name from a phone number.
 * Supports formats: "+55 51 99999-9999", "(51) 99999-9999", "51 99999-9999"
 */
export const getStateFromPhone = (phone: string): string => {
    if (!phone) return '';

    // Extract DDD: handle "+55 51 ...", "(51) ...", "51 ..."
    let ddd = '';
    const parenMatch = phone.match(/\((\d{2})\)/);
    if (parenMatch) {
        ddd = parenMatch[1];
    } else {
        // Remove +55 prefix and country code variations, then grab next 2 digits
        const cleaned = phone.replace(/^\+?55\s*/, '').replace(/\D/g, '');
        ddd = cleaned.substring(0, 2);
    }

    if (!ddd) return '';
    const n = parseInt(ddd);

    if (n >= 11 && n <= 19) return 'São Paulo';
    if (n === 21 || n === 22 || n === 24) return 'Rio de Janeiro';
    if (n === 27 || n === 28) return 'Espírito Santo';
    if (n >= 31 && n <= 38) return 'Minas Gerais';
    if (n >= 41 && n <= 46) return 'Paraná';
    if (n >= 47 && n <= 49) return 'Santa Catarina';
    if (n >= 51 && n <= 55) return 'Rio Grande do Sul';
    if (n === 61) return 'Distrito Federal';
    if (n === 62 || n === 64) return 'Goiás';
    if (n === 63) return 'Tocantins';
    if (n === 65 || n === 66) return 'Mato Grosso';
    if (n === 67) return 'Mato Grosso do Sul';
    if (n === 68) return 'Acre';
    if (n === 69) return 'Rondônia';
    if (n === 71 || n === 73 || n === 74 || n === 75 || n === 77) return 'Bahia';
    if (n === 79) return 'Sergipe';
    if (n === 81 || n === 87) return 'Pernambuco';
    if (n === 82) return 'Alagoas';
    if (n === 83) return 'Paraíba';
    if (n === 84) return 'Rio Grande do Norte';
    if (n === 85 || n === 88) return 'Ceará';
    if (n === 86 || n === 89) return 'Piauí';
    if (n === 91 || n === 93 || n === 94) return 'Pará';
    if (n === 92 || n === 97) return 'Amazonas';
    if (n === 95) return 'Roraima';
    if (n === 96) return 'Amapá';
    if (n === 98 || n === 99) return 'Maranhão';

    return '';
};
