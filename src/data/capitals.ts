export interface City {
  id: string
  name: string
  state: string
  lat: number
  lon: number
}

/** As 27 capitais brasileiras, ordenadas por nome. */
export const CAPITALS: readonly City[] = [
  { id: 'rio-branco', name: 'Rio Branco', state: 'AC', lat: -9.9754, lon: -67.8249 },
  { id: 'maceio', name: 'Maceió', state: 'AL', lat: -9.6498, lon: -35.7089 },
  { id: 'macapa', name: 'Macapá', state: 'AP', lat: 0.0349, lon: -51.0694 },
  { id: 'manaus', name: 'Manaus', state: 'AM', lat: -3.1019, lon: -60.025 },
  { id: 'salvador', name: 'Salvador', state: 'BA', lat: -12.9777, lon: -38.5016 },
  { id: 'fortaleza', name: 'Fortaleza', state: 'CE', lat: -3.7319, lon: -38.5267 },
  { id: 'brasilia', name: 'Brasília', state: 'DF', lat: -15.7939, lon: -47.8828 },
  { id: 'vitoria', name: 'Vitória', state: 'ES', lat: -20.3155, lon: -40.3128 },
  { id: 'goiania', name: 'Goiânia', state: 'GO', lat: -16.6869, lon: -49.2648 },
  { id: 'sao-luis', name: 'São Luís', state: 'MA', lat: -2.5307, lon: -44.3068 },
  { id: 'cuiaba', name: 'Cuiabá', state: 'MT', lat: -15.601, lon: -56.0974 },
  { id: 'campo-grande', name: 'Campo Grande', state: 'MS', lat: -20.4697, lon: -54.6201 },
  { id: 'belo-horizonte', name: 'Belo Horizonte', state: 'MG', lat: -19.9167, lon: -43.9345 },
  { id: 'belem', name: 'Belém', state: 'PA', lat: -1.4558, lon: -48.5039 },
  { id: 'joao-pessoa', name: 'João Pessoa', state: 'PB', lat: -7.115, lon: -34.8631 },
  { id: 'curitiba', name: 'Curitiba', state: 'PR', lat: -25.4284, lon: -49.2733 },
  { id: 'recife', name: 'Recife', state: 'PE', lat: -8.0476, lon: -34.877 },
  { id: 'teresina', name: 'Teresina', state: 'PI', lat: -5.0892, lon: -42.8019 },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lon: -43.1729 },
  { id: 'natal', name: 'Natal', state: 'RN', lat: -5.7945, lon: -35.211 },
  { id: 'porto-alegre', name: 'Porto Alegre', state: 'RS', lat: -30.0346, lon: -51.2177 },
  { id: 'porto-velho', name: 'Porto Velho', state: 'RO', lat: -8.7612, lon: -63.9004 },
  { id: 'boa-vista', name: 'Boa Vista', state: 'RR', lat: 2.8235, lon: -60.6758 },
  { id: 'florianopolis', name: 'Florianópolis', state: 'SC', lat: -27.5954, lon: -48.548 },
  { id: 'sao-paulo', name: 'São Paulo', state: 'SP', lat: -23.5505, lon: -46.6333 },
  { id: 'aracaju', name: 'Aracaju', state: 'SE', lat: -10.9472, lon: -37.0731 },
  { id: 'palmas', name: 'Palmas', state: 'TO', lat: -10.184, lon: -48.3336 },
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

export const DEFAULT_CITY_ID = 'sao-paulo'

export function findCity(id: string): City | undefined {
  return CAPITALS.find((c) => c.id === id)
}
