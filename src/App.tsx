import { Suspense, lazy } from 'react'
import { CityPicker } from '@/components/CityPicker'
import { HourStrip } from '@/components/HourStrip'
import { HourlyTable } from '@/components/HourlyTable'
import { Legend } from '@/components/Legend'
import { PollutantCards } from '@/components/PollutantCards'
import { findCity } from '@/data/capitals'
import { useAirQuality } from '@/hooks/useAirQuality'
import { useCityFromUrl } from '@/hooks/useCityFromUrl'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { aggregateAqi } from '@/lib/aqi'
import { bandColor } from '@/lib/bandColor'
import { isStale } from '@/lib/db'
import { formatDayHour, formatRelativeMinutes } from '@/lib/format'
import { POLLUTANT_FORMULAS } from '@/types/air'

/**
 * O Recharts responde por quase metade do bundle. Carregar sob demanda tira
 * ~330 KB do caminho crítico: o número grande e a faixa de 48 horas — que são
 * o que o usuário veio ver — aparecem antes de o gráfico sequer baixar.
 */
const TrendChart = lazy(() =>
  import('@/components/TrendChart').then((m) => ({ default: m.TrendChart })),
)

export default function App() {
  const [cityId, setCityId] = useCityFromUrl()
  const online = useOnlineStatus()
  const { data, error, isPending, isFetching, refetch } = useAirQuality(cityId)

  const city = findCity(cityId)
  const latest = data?.samples.at(-1)
  const reading = latest ? aggregateAqi(latest) : null

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="masthead shell">
        <div>
          <p className="masthead__mark">Painel do ar</p>
          <p className="masthead__source">27 capitais · atualização horária</p>
        </div>
        <CityPicker value={cityId} onChange={setCityId} />
      </header>

      <main id="conteudo" className="shell">
        {isPending && <LoadingState />}

        {!isPending && error && (
          <div className="state">
            <h2>Não deu para carregar as leituras</h2>
            <p>
              {error instanceof Error ? error.message : 'Erro inesperado.'}
              {!online && ' Você parece estar sem conexão.'}
            </p>
            <button type="button" className="button" onClick={() => refetch()}>
              Tentar de novo
            </button>
          </div>
        )}

        {data && latest && city && (
          <>
            <section
              className="hero"
              style={{ '--band': bandColor(reading?.band.id) } as React.CSSProperties}
            >
              <h1 className="hero__place">
                {city.name} <span>{city.state}</span>
              </h1>

              <div className="hero__readout">
                <p className="hero__index">
                  {reading?.aqi ?? '—'}
                  <span className="visually-hidden">
                    {' '}
                    de índice de qualidade do ar, faixa {reading?.band.label ?? 'indisponível'}
                  </span>
                </p>
                <div className="hero__meta">
                  <p className="hero__band" aria-hidden="true">
                    {reading?.band.label ?? 'Sem leitura'}
                  </p>
                  <p className="hero__advice">
                    {reading?.band.advice ?? 'A estação não reportou dados nesta hora.'}
                  </p>
                  {reading && (
                    <p className="hero__dominant">
                      Poluente dominante: {POLLUTANT_FORMULAS[reading.dominant]} · leitura de{' '}
                      {formatDayHour(latest.time)}
                    </p>
                  )}
                </div>
              </div>

              {(isStale(data) || !online) && (
                <div className="banner" role="status">
                  <span>
                    Mostrando dados salvos {formatRelativeMinutes(data.fetchedAt)}.
                    {!online && ' Sem conexão no momento.'}
                  </span>
                  <button
                    type="button"
                    className="button button--quiet"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    {isFetching ? 'Atualizando…' : 'Atualizar agora'}
                  </button>
                </div>
              )}

              <HourStrip samples={data.samples} />
              <Legend />
            </section>

            <section className="section" aria-labelledby="poluentes">
              <h2 id="poluentes" className="section__title">
                Concentrações agora
              </h2>
              <p className="section__note">
                Medidas da estação mais próxima de {city.name}, às {formatDayHour(latest.time)}.
              </p>
              <PollutantCards sample={latest} units={data.units} />
            </section>

            <section className="section" aria-labelledby="tendencia">
              <h2 id="tendencia" className="section__title">
                Tendência do material particulado
              </h2>
              <p className="section__note">
                PM2,5 em linha cheia, PM10 tracejado. São as duas frações que entram no cálculo do
                índice.
              </p>
              <Suspense
                fallback={
                  <div className="chart skeleton" role="status" aria-label="Carregando gráfico" />
                }
              >
                <TrendChart samples={data.samples} />
              </Suspense>
            </section>

            <section className="section" aria-labelledby="horas">
              <h2 id="horas" className="section__title">
                Leituras hora a hora
              </h2>
              <p className="section__note">Da mais recente para a mais antiga.</p>
              <HourlyTable samples={data.samples} />
            </section>
          </>
        )}
      </main>

      <footer className="colophon shell">
        <p>
          Dados da{' '}
          <a href="https://open-meteo.com/" rel="noreferrer noopener" target="_blank">
            Open-Meteo Air Quality API
          </a>
          , modelo CAMS. Índice calculado pelas faixas da US EPA. Não substitui a rede oficial de
          monitoramento do seu estado.
        </p>
      </footer>
    </>
  )
}

function LoadingState() {
  return (
    <div className="hero" aria-busy="true">
      <p className="visually-hidden" role="status">
        Carregando leituras.
      </p>
      <div className="skeleton" style={{ height: '2rem', width: '14rem' }} />
      <div className="skeleton" style={{ height: '6rem', width: '9rem', marginTop: '1rem' }} />
      <div className="skeleton" style={{ height: '84px', marginTop: '2rem' }} />
    </div>
  )
}
