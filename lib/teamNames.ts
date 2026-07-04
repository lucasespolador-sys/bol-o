// Nomes em português e códigos FIFA (a API usa nomes em inglês)
const TEAM_META: Record<string, { pt: string; code: string }> = {
  'Mexico': { pt: 'México', code: 'MEX' },
  'South Africa': { pt: 'África do Sul', code: 'RSA' },
  'South Korea': { pt: 'Coreia do Sul', code: 'KOR' },
  'Czech Republic': { pt: 'República Tcheca', code: 'CZE' },
  'Canada': { pt: 'Canadá', code: 'CAN' },
  'Switzerland': { pt: 'Suíça', code: 'SUI' },
  'Qatar': { pt: 'Catar', code: 'QAT' },
  'Bosnia and Herzegovina': { pt: 'Bósnia', code: 'BIH' },
  'Brazil': { pt: 'Brasil', code: 'BRA' },
  'Morocco': { pt: 'Marrocos', code: 'MAR' },
  'Haiti': { pt: 'Haiti', code: 'HAI' },
  'Scotland': { pt: 'Escócia', code: 'SCO' },
  'USA': { pt: 'Estados Unidos', code: 'USA' },
  'United States': { pt: 'Estados Unidos', code: 'USA' },
  'Paraguay': { pt: 'Paraguai', code: 'PAR' },
  'Australia': { pt: 'Austrália', code: 'AUS' },
  'Turkiye': { pt: 'Turquia', code: 'TUR' },
  'Turkey': { pt: 'Turquia', code: 'TUR' },
  'Germany': { pt: 'Alemanha', code: 'GER' },
  'Curaçao': { pt: 'Curaçao', code: 'CUW' },
  'Curacao': { pt: 'Curaçao', code: 'CUW' },
  'Ivory Coast': { pt: 'Costa do Marfim', code: 'CIV' },
  'Ecuador': { pt: 'Equador', code: 'ECU' },
  'Netherlands': { pt: 'Holanda', code: 'NED' },
  'Japan': { pt: 'Japão', code: 'JPN' },
  'Tunisia': { pt: 'Tunísia', code: 'TUN' },
  'Sweden': { pt: 'Suécia', code: 'SWE' },
  'Belgium': { pt: 'Bélgica', code: 'BEL' },
  'Egypt': { pt: 'Egito', code: 'EGY' },
  'Iran': { pt: 'Irã', code: 'IRN' },
  'New Zealand': { pt: 'Nova Zelândia', code: 'NZL' },
  'Spain': { pt: 'Espanha', code: 'ESP' },
  'Cape Verde': { pt: 'Cabo Verde', code: 'CPV' },
  'Saudi Arabia': { pt: 'Arábia Saudita', code: 'KSA' },
  'Uruguay': { pt: 'Uruguai', code: 'URU' },
  'France': { pt: 'França', code: 'FRA' },
  'Senegal': { pt: 'Senegal', code: 'SEN' },
  'Norway': { pt: 'Noruega', code: 'NOR' },
  'Iraq': { pt: 'Iraque', code: 'IRQ' },
  'Argentina': { pt: 'Argentina', code: 'ARG' },
  'Algeria': { pt: 'Argélia', code: 'ALG' },
  'Austria': { pt: 'Áustria', code: 'AUT' },
  'Jordan': { pt: 'Jordânia', code: 'JOR' },
  'Portugal': { pt: 'Portugal', code: 'POR' },
  'Colombia': { pt: 'Colômbia', code: 'COL' },
  'Uzbekistan': { pt: 'Uzbequistão', code: 'UZB' },
  'Congo DR': { pt: 'RD Congo', code: 'COD' },
  'DR Congo': { pt: 'RD Congo', code: 'COD' },
  'England': { pt: 'Inglaterra', code: 'ENG' },
  'Croatia': { pt: 'Croácia', code: 'CRO' },
  'Ghana': { pt: 'Gana', code: 'GHA' },
  'Panama': { pt: 'Panamá', code: 'PAN' },
};

export function teamNamePt(name: string | null | undefined): string {
  if (!name) return '';
  return TEAM_META[name]?.pt ?? name;
}

export function teamCode(name: string | null | undefined): string {
  if (!name) return '—';
  return TEAM_META[name]?.code ?? name.slice(0, 3).toUpperCase();
}
