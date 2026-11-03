// Release windows follow each issuer's actual reporting cadence, not fixed months.
const DAY=86400000;
const parse=s=>{const value=Date.parse(String(s ?? '').slice(0,10));return Number.isFinite(value)?value:null;};
export function inEarningsWindow(company,today=new Date()) {
  const now=parse(today.toISOString()),dates=Object.values(company?.reportDates ?? {}).map(parse).filter(d=>d!==null&&d<=now);
  const explicit=parse(company?.nextEarningsDate);
  if(explicit!==null&&now>=explicit-14*DAY&&now<=explicit+35*DAY)return true;
  if(!dates.length)return true;
  const latest=Math.max(...dates);
  if(now-latest<=21*DAY)return true;
  const predictions=[latest+91*DAY],year=today.getUTCFullYear();
  for(const filed of dates) {
    if(now-filed>800*DAY)continue;
    const previous=new Date(filed);
    for(const y of [year,year+1])if(y>previous.getUTCFullYear())predictions.push(Date.UTC(y,previous.getUTCMonth(),previous.getUTCDate()));
  }
  return predictions.some(d=>now>=d-14*DAY&&now<=d+35*DAY);
}
