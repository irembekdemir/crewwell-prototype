import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './nasa-data.css'

type Dataset = { headers: string[]; rows: string[][] }

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 }
      else quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field.trim()); field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field.trim()); field = ''
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
    } else field += char
  }
  row.push(field.trim())
  if (row.some((cell) => cell.length > 0)) rows.push(row)
  return rows
}

function numberFromCell(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export default function NasaDataImport() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [filename, setFilename] = useState('')
  const [valueColumn, setValueColumn] = useState('')
  const [timeColumn, setTimeColumn] = useState('')
  const [error, setError] = useState('')

  const numericColumns = useMemo(() => {
    if (!dataset) return []
    return dataset.headers.filter((header, index) =>
      dataset.rows.some((row) => numberFromCell(row[index]) !== null),
    )
  }, [dataset])

  const columnIndex = dataset?.headers.indexOf(valueColumn) ?? -1
  const timeIndex = dataset && timeColumn ? dataset.headers.indexOf(timeColumn) : -1
  const chartData = useMemo(() => {
    if (!dataset || columnIndex < 0) return []
    return dataset.rows
      .map((row, index) => ({
        label: timeIndex >= 0 ? row[timeIndex] || `Row ${index + 1}` : `Row ${index + 1}`,
        value: numberFromCell(row[columnIndex]),
      }))
      .filter((point): point is { label: string; value: number } => point.value !== null)
      .slice(0, 100)
  }, [dataset, columnIndex, timeIndex])

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    setDataset(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a CSV file.'); return
    }
    try {
      const parsed = parseCsv(await file.text())
      if (parsed.length < 2 || parsed[0].length < 2) {
        setError('The CSV needs a header row and at least one data row.'); return
      }
      const headers = parsed[0].map((header, index) => header || `Column ${index + 1}`)
      const rows = parsed.slice(1).map((row) => headers.map((_, index) => row[index] ?? ''))
      setDataset({ headers, rows })
      setFilename(file.name)
      const numericHeader = headers.find((header, index) => rows.some((row) => numberFromCell(row[index]) !== null)) ?? ''
      setValueColumn(numericHeader)
      setTimeColumn(headers.find((header) => /time|date|day|visit|sample|collection/i.test(header)) ?? '')
    } catch {
      setError('Could not read this CSV. Check the file format and try again.')
    }
  }

  return (
    <section className="panel nasa-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">NASA OPEN DATA · OSD-575</p><h2>Inspiration4 research data</h2></div>
        <span className="nasa-data-badge">Research dataset</span>
      </div>
      <p className="nasa-description">
        Import a CSV downloaded from the NASA Open Science Data Repository. The file is parsed in this browser; it is not uploaded to a server. Select a numeric column to explore its values.
      </p>
      <div className="nasa-source-links">
        <a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-575" target="_blank" rel="noreferrer">OSD-575 study page ↗</a>
        <a href="https://osdr.nasa.gov/osdr/data/osd/files/575" target="_blank" rel="noreferrer">Study files ↗</a>
        <a href="https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/" target="_blank" rel="noreferrer">NASA dataset announcement ↗</a>
      </div>
      <p className="nasa-citation"><strong>Study:</strong> SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (OSD-575). Cite the study and its associated publication as shown on the OSDR record when using these data.</p>
      <label className="csv-upload">
        <span>{filename ? `Selected: ${filename}` : 'Choose an OSDR CSV file'}</span>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} />
      </label>
      {error && <p className="nasa-error" role="alert">{error}</p>}
      {dataset && <>
        <div className="nasa-mapping">
          <label>Numeric field
            <select className="select-control" value={valueColumn} onChange={(event) => setValueColumn(event.target.value)}>
              {numericColumns.map((column) => <option key={column} value={column}>{column}</option>)}
            </select>
          </label>
          <label>Timepoint / label column (optional)
            <select className="select-control" value={timeColumn} onChange={(event) => setTimeColumn(event.target.value)}>
              <option value="">Use row order</option>
              {dataset.headers.map((column) => <option key={column} value={column}>{column}</option>)}
            </select>
          </label>
        </div>
        {chartData.length ? <>
          <div className="nasa-chart-heading"><strong>{valueColumn}</strong><span>{chartData.length} numeric rows · values shown as provided in the CSV</span></div>
          <div className="nasa-chart-wrap"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}><defs><linearGradient id="nasaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65d6c4" stopOpacity={0.28} /><stop offset="95%" stopColor="#65d6c4" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#253247" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#718096" tickLine={false} minTickGap={20} />
              <YAxis stroke="#718096" tickLine={false} />
              <Tooltip contentStyle={{ background: '#111c2c', border: '1px solid #29364b', borderRadius: 12, color: '#edf4ff' }} />
              <Area type="monotone" dataKey="value" stroke="#65d6c4" strokeWidth={2} fill="url(#nasaFill)" />
            </AreaChart>
          </ResponsiveContainer></div>
          <div className="nasa-table-scroll"><table><thead><tr>{dataset.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>{dataset.rows.slice(0, 8).map((row, rowIndex) => <tr key={rowIndex}>{dataset.headers.slice(0, 6).map((header, index) => <td key={`${rowIndex}-${header}`}>{row[index]}</td>)}</tr>)}</tbody>
          </table></div>
        </> : <p className="nasa-error">No numeric columns were detected. Check that the selected file is a tabular results CSV.</p>}
      </>}
      <p className="nasa-disclaimer">This is historical research data, not live telemetry and not a measurement from the demo crew profile. Verify units, participant/timepoint metadata, citation, and reuse terms on the OSDR study page before interpreting or redistributing data.</p>
    </section>
  )
}
