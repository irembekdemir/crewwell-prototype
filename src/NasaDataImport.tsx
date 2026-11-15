import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './nasa-data.css'

type Dataset = { headers: string[]; rows: string[][] }
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 5000
const MAX_COLUMNS = 100
export const OSDR_CMP_CSV_URL = 'https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 }
      else if (quoted || field.length === 0) quoted = !quoted
      else throw new Error('Malformed quote in CSV.')
    } else if (char === ',' && !quoted) { row.push(field.trim()); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field.trim()); field = ''
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      if (rows.length > MAX_ROWS + 1) throw new Error('CSV contains too many rows.')
      row = []
    } else { field += char; if (field.length > 20000) throw new Error('A CSV cell is too long.') }
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.')
  row.push(field.trim()); if (row.some((cell) => cell.length > 0)) rows.push(row)
  if (rows.length > MAX_ROWS + 1) throw new Error('CSV contains too many rows.')
  return rows
}
function numberFromCell(value: string | undefined): number | null {
  if (!value) return null
  const normalized = value.trim()
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export default function NasaDataImport() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [filename, setFilename] = useState('')
  const [valueColumn, setValueColumn] = useState('')
  const [timeColumn, setTimeColumn] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const numericColumns = useMemo(() => dataset ? dataset.headers.filter((_, index) => dataset.rows.some((row) => numberFromCell(row[index]) !== null)) : [], [dataset])
  const columnIndex = dataset?.headers.indexOf(valueColumn) ?? -1
  const timeIndex = dataset && timeColumn ? dataset.headers.indexOf(timeColumn) : -1
  const chartData = useMemo(() => dataset && columnIndex >= 0 ? dataset.rows.map((row, index) => ({ label: timeIndex >= 0 ? row[timeIndex] || `Row ${index + 1}` : `Row ${index + 1}`, value: numberFromCell(row[columnIndex]) })).filter((point): point is { label: string; value: number } => point.value !== null).slice(0, 100) : [], [dataset, columnIndex, timeIndex])
  function resetImport() { setDataset(null); setFilename(''); setValueColumn(''); setTimeColumn(''); setError(''); if (fileInput.current) fileInput.current.value = '' }
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setError(''); setDataset(null); setFilename('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Please choose a CSV file.'); event.target.value = ''; return }
    if (file.size > MAX_FILE_BYTES) { setError('File exceeds the 5 MB limit. Choose a smaller CSV.'); event.target.value = ''; return }
    if (!file.size) { setError('The selected file is empty.'); event.target.value = ''; return }
    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
      if (parsed.length < 2 || parsed[0].length < 2) throw new Error('CSV needs a header row and at least one data row.')
      if (parsed[0].length > MAX_COLUMNS) throw new Error(`CSV has too many columns. Limit: ${MAX_COLUMNS}.`)
      const headers = parsed[0].map((header, index) => header || `Column ${index + 1}`)
      const rows = parsed.slice(1).map((row) => headers.map((_, index) => row[index] ?? ''))
      const numeric = headers.filter((_, index) => rows.some((row) => numberFromCell(row[index]) !== null))
      if (!numeric.length) throw new Error('No numeric columns were found in this CSV.')
      setDataset({ headers, rows }); setFilename(file.name); setValueColumn(numeric[0]); setTimeColumn(headers.find((header) => /time|date|day|visit|sample|collection/i.test(header)) ?? '')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not read this CSV. Check the file format and try again.'); event.target.value = '' }
  }
  return <section className="panel nasa-panel">
    <div className="panel-heading"><div><p className="eyebrow">NASA OPEN DATA · OSD-575</p><h2>Inspiration4 research data</h2></div><span className="nasa-data-badge">Historical research</span></div>
    <p className="nasa-description">Download the OSDR tabular results CSV or choose a compatible CSV from your device. It is parsed locally and is not uploaded. Import limits: 5 MB, 5,000 data rows, 100 columns.</p>
    <div className="nasa-source-links"><a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-575" target="_blank" rel="noreferrer">OSD-575 study record ↗</a><a href="https://osdr.nasa.gov/osdr/data/osd/files/575" target="_blank" rel="noreferrer">All OSDR files ↗</a><a href="https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/" target="_blank" rel="noreferrer">NASA announcement ↗</a></div>
    <a className="osdr-download" href={OSDR_CMP_CSV_URL} target="_blank" rel="noreferrer">Download CMP results CSV ↗ <small>OSD-575 · CSV</small></a>
    <p className="nasa-citation"><strong>Study:</strong> SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (OSD-575). Use the study citation and dataset metadata shown on OSDR.</p>
    <label className="csv-upload"><span>{filename ? `Selected: ${filename}` : 'Choose an OSDR CSV file'}</span><input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} /></label>
    {error && <p className="nasa-error" role="alert">{error}</p>}
    {dataset && <><div className="nasa-import-actions"><p className="nasa-file-note">Imported file is held in memory only and cleared on refresh.</p><button className="clear-button" type="button" onClick={resetImport}>Clear imported file</button></div>
      <div className="nasa-mapping"><label>Numeric field<select className="select-control" value={valueColumn} onChange={(event) => setValueColumn(event.target.value)}>{numericColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label><label>Timepoint / label column (optional)<select className="select-control" value={timeColumn} onChange={(event) => setTimeColumn(event.target.value)}><option value="">Use row order</option>{dataset.headers.map((column) => <option key={column} value={column}>{column}</option>)}</select></label></div>
      {chartData.length ? <><div className="nasa-chart-heading"><strong>{valueColumn}</strong><span>{chartData.length} numeric rows · CSV values as provided</span></div><div className="nasa-chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="nasaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65d6c4" stopOpacity={0.28} /><stop offset="95%" stopColor="#65d6c4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#253247" strokeDasharray="4 4" /><XAxis dataKey="label" stroke="#718096" tickLine={false} minTickGap={20} /><YAxis stroke="#718096" tickLine={false} /><Tooltip contentStyle={{ background: '#111c2c', border: '1px solid #29364b', borderRadius: 12, color: '#edf4ff' }} /><Area type="monotone" dataKey="value" stroke="#65d6c4" strokeWidth={2} fill="url(#nasaFill)" /></AreaChart></ResponsiveContainer></div><div className="nasa-table-scroll"><table><thead><tr>{dataset.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{dataset.rows.slice(0, 8).map((row, rowIndex) => <tr key={rowIndex}>{dataset.headers.slice(0, 6).map((header, index) => <td key={`${rowIndex}-${header}`}>{row[index]}</td>)}</tr>)}</tbody></table></div></> : <p className="nasa-error">No valid numeric values were found in the selected column.</p>}</>}
    <p className="nasa-disclaimer">Historical research data, not live telemetry or a measurement from the demo crew profile. Verify units, participant/timepoint context, citation, and reuse terms on OSDR before interpretation or redistribution.</p>
  </section>
}
