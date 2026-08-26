import { CAPITALS } from '@/data/capitals'

interface Props {
  value: string
  onChange: (cityId: string) => void
}

/**
 * Um `<select>` nativo, de propósito. Com 27 opções um combobox customizado só
 * traria bugs de teclado e de leitor de tela — o nativo já funciona em tudo,
 * inclusive no seletor em roda do iOS.
 */
export function CityPicker({ value, onChange }: Props) {
  return (
    <div className="picker">
      <label htmlFor="city">Capital</label>
      <select id="city" value={value} onChange={(event) => onChange(event.target.value)}>
        {CAPITALS.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name} — {city.state}
          </option>
        ))}
      </select>
    </div>
  )
}
