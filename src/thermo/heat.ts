/** Capacity rate m_dot * c_p in kW/K from the full potential down to ambient (Eq. 2). */
export function mcpFromQmax(QmaxkW: number, tInC: number, tAmbC: number): number {
  if (!(tInC > tAmbC)) return NaN;
  return QmaxkW / (tInC - tAmbC);
}

/** Sensible heat released by a stream cooled from tIn to tOut (Eq. 1), kW. */
export function qSource(mcp: number, tInC: number, tOutC: number): number {
  return mcp * Math.max(0, tInC - tOutC);
}

/** Heat delivered to the sink for a given source heat and COP: Q_src * COP / (COP - 1). */
export function qSink(qSrc: number, cop: number): number {
  if (!(cop > 1)) return NaN;
  return (qSrc * cop) / (cop - 1);
}

/** Electric power required: Q_src / (COP - 1). */
export function pElectric(qSrc: number, cop: number): number {
  if (!(cop > 1)) return NaN;
  return qSrc / (cop - 1);
}
