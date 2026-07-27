"use client";

import { FormEvent, useMemo, useState } from "react";

type Status = "RECEIVED" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_REPORTER" | "RESOLVED" | "CLOSED";
type Priority = "Mendesak" | "Tinggi" | "Normal" | "Rendah";
type Report = {
  id: string; reporter: string; contact: string; title: string; category: string;
  location: string; priority: Priority; status: Status; handler: string;
  receivedAt: string; updatedAt: string; dueAt?: string; summary: string;
  timeline: { date: string; label: string; note: string }[];
};

const labels: Record<Status, string> = {
  RECEIVED: "Laporan masuk", ASSIGNED: "Ditugaskan", IN_PROGRESS: "Dalam penanganan",
  WAITING_REPORTER: "Menunggu pelapor", RESOLVED: "Selesai ditangani", CLOSED: "Ditutup",
};
const tones: Record<Status, string> = {
  RECEIVED: "slate", ASSIGNED: "violet", IN_PROGRESS: "amber",
  WAITING_REPORTER: "orange", RESOLVED: "teal", CLOSED: "green",
};
const now = new Date("2026-07-27T12:00:00+07:00");
const active: Status[] = ["RECEIVED", "ASSIGNED", "IN_PROGRESS", "WAITING_REPORTER"];
const timeline = (items: string[][]) => items.map(([date, label, note]) => ({ date, label, note }));

const seed: Report[] = [
  { id:"KSPM-2607-0184", reporter:"Rina Mulyani", contact:"08•• •••• 4217", title:"Akses bantuan usaha mikro belum jelas", category:"Ekonomi rakyat", location:"KSP Mendekat — Bogor", priority:"Tinggi", status:"IN_PROGRESS", handler:"Maya Putri", receivedAt:"2026-07-18T09:20:00+07:00", updatedAt:"2026-07-26T14:10:00+07:00", dueAt:"2026-07-29T17:00:00+07:00", summary:"Pelapor membutuhkan kejelasan jalur bantuan untuk mengembangkan usaha olahan pangan rumahan.", timeline:timeline([["18 Jul, 09.20","Laporan diterima","Dicatat oleh operator kegiatan Bogor."],["19 Jul, 10.05","Ditugaskan","Dialihkan ke Maya Putri untuk koordinasi program."],["26 Jul, 14.10","Tindak lanjut","Persyaratan awal telah dikirim kepada pelapor."]]) },
  { id:"KSPM-2607-0181", reporter:"Dedi Suhendar", contact:"d•••@mail.id", title:"Kendala verifikasi bantuan perumahan", category:"Perumahan", location:"KSP Mendekat — Tangerang", priority:"Mendesak", status:"ASSIGNED", handler:"Rafi Pratama", receivedAt:"2026-07-15T11:45:00+07:00", updatedAt:"2026-07-24T08:35:00+07:00", dueAt:"2026-07-25T17:00:00+07:00", summary:"Dokumen telah diserahkan, namun status verifikasi tidak berubah selama lebih dari tiga minggu.", timeline:timeline([["15 Jul, 11.45","Laporan diterima","Dokumen dasar diperiksa oleh operator."],["16 Jul, 09.15","Terverifikasi","Laporan dinyatakan lengkap dan dapat ditangani."],["24 Jul, 08.35","Ditugaskan","Rafi Pratama menjadi penanggung jawab."]]) },
  { id:"KSPM-2607-0179", reporter:"Siti Marhamah", contact:"08•• •••• 1092", title:"Rujukan layanan kesehatan ibu", category:"Kesehatan", location:"KSP Mendekat — Depok", priority:"Tinggi", status:"WAITING_REPORTER", handler:"Nina Larasati", receivedAt:"2026-07-13T13:05:00+07:00", updatedAt:"2026-07-25T10:50:00+07:00", dueAt:"2026-07-28T17:00:00+07:00", summary:"Pelapor meminta bantuan penjelasan prosedur rujukan lanjutan untuk pemeriksaan kehamilan berisiko.", timeline:timeline([["13 Jul, 13.05","Laporan diterima","Kontak pelapor telah diverifikasi."],["14 Jul, 09.30","Dalam penanganan","Petugas menghubungi fasilitas rujukan."],["25 Jul, 10.50","Menunggu pelapor","Menunggu foto surat rujukan terakhir."]]) },
  { id:"KSPM-2607-0173", reporter:"Ahmad Fahrudin", contact:"08•• •••• 8334", title:"Perbaikan data penerima bantuan pendidikan", category:"Pendidikan", location:"KSP Mendekat — Bekasi", priority:"Normal", status:"IN_PROGRESS", handler:"Bagas Wicaksono", receivedAt:"2026-07-09T08:40:00+07:00", updatedAt:"2026-07-20T16:30:00+07:00", dueAt:"2026-07-26T17:00:00+07:00", summary:"Nama anak tercatat berbeda pada dua dokumen sehingga proses bantuan pendidikan tertahan.", timeline:timeline([["9 Jul, 08.40","Laporan diimpor","Masuk dari rekap kegiatan Bekasi."],["10 Jul, 11.20","Terverifikasi","Ketidaksesuaian dokumen telah dikonfirmasi."],["20 Jul, 16.30","Tindak lanjut","Koreksi data diajukan ke unit layanan."]]) },
  { id:"KSPM-2607-0168", reporter:"Lina Handayani", contact:"l•••@mail.id", title:"Informasi sertifikasi tanah keluarga", category:"Pertanahan", location:"KSP Mendekat — Cianjur", priority:"Normal", status:"RESOLVED", handler:"Maya Putri", receivedAt:"2026-07-06T10:10:00+07:00", updatedAt:"2026-07-23T15:20:00+07:00", summary:"Pelapor memerlukan penjelasan tahapan dan dokumen awal untuk proses sertifikasi.", timeline:timeline([["6 Jul, 10.10","Laporan diterima","Data kontak dan lokasi tanah dicatat."],["8 Jul, 13.45","Dalam penanganan","Petugas menyiapkan daftar persyaratan."],["23 Jul, 15.20","Selesai ditangani","Panduan dan titik layanan telah diberikan."]]) },
  { id:"KSPM-2607-0161", reporter:"Bambang Riyadi", contact:"08•• •••• 5610", title:"Keluhan distribusi pupuk kelompok tani", category:"Pertanian", location:"KSP Mendekat — Karawang", priority:"Tinggi", status:"CLOSED", handler:"Rafi Pratama", receivedAt:"2026-07-02T14:30:00+07:00", updatedAt:"2026-07-21T09:05:00+07:00", summary:"Kelompok tani melaporkan ketidaksesuaian jadwal distribusi pupuk pada kios wilayah.", timeline:timeline([["2 Jul, 14.30","Laporan diterima","Daftar kelompok tani dilampirkan."],["4 Jul, 09.00","Dalam penanganan","Koordinasi dilakukan dengan unit distribusi."],["21 Jul, 09.05","Ditutup","Jadwal baru dikonfirmasi oleh pelapor."]]) },
];

const age = (iso: string) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));
const shortDate = (iso: string) => new Intl.DateTimeFormat("id-ID", { day:"numeric", month:"short" }).format(new Date(iso));
const nextStatus = (status: Status): Status | null => ({ RECEIVED:"ASSIGNED", ASSIGNED:"IN_PROGRESS", IN_PROGRESS:"RESOLVED", WAITING_REPORTER:"IN_PROGRESS", RESOLVED:"CLOSED" } as Partial<Record<Status,Status>>)[status] ?? null;

export default function Home() {
  const [reports,setReports] = useState(seed);
  const [view,setView] = useState("ringkasan");
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("ALL");
  const [selected,setSelected] = useState<string|null>(null);
  const [form,setForm] = useState(false);
  const [toast,setToast] = useState("");
  const activeReports = reports.filter(r => active.includes(r.status));
  const overdue = activeReports.filter(r => r.dueAt && new Date(r.dueAt) < now);
  const stale = activeReports.filter(r => age(r.updatedAt) >= 7);
  const resolved = reports.filter(r => ["RESOLVED","CLOSED"].includes(r.status));
  const visible = useMemo(() => reports.filter(r => {
    const haystack = [r.id,r.reporter,r.title,r.category,r.handler].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (filter === "ALL" || r.status === filter);
  }), [reports,query,filter]);
  const current = reports.find(r => r.id === selected) ?? null;
  const categories = reports.reduce<Record<string,number>>((acc,r) => ({...acc,[r.category]:(acc[r.category]??0)+1}),{});
  const bands = [["0–3 hari",0,3,"fresh"],["4–7 hari",4,7,"watch"],["8–14 hari",8,14,"risk"],[">14 hari",15,999,"late"]] as const;
  const notify = (message:string) => { setToast(message); window.setTimeout(() => setToast(""),2500); };

  function advance(report: Report) {
    const next = nextStatus(report.status); if (!next) return;
    setReports(list => list.map(r => r.id === report.id ? {...r,status:next,updatedAt:now.toISOString(),timeline:[...r.timeline,{date:"27 Jul, 12.00",label:labels[next],note:"Status diperbarui dalam simulasi."}]} : r));
    notify(`${report.id} dipindahkan ke ${labels[next]}.`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const report: Report = { id:`KSPM-2607-${String(185 + reports.length - seed.length).padStart(4,"0")}`, reporter:String(data.get("reporter")), contact:String(data.get("contact")), title:String(data.get("title")), category:String(data.get("category")), location:String(data.get("location")), priority:String(data.get("priority")) as Priority, status:"RECEIVED", handler:"Belum ditugaskan", receivedAt:now.toISOString(), updatedAt:now.toISOString(), summary:String(data.get("summary")), timeline:[{date:"27 Jul, 12.00",label:"Laporan diterima",note:"Laporan baru dicatat melalui simulasi."}] };
    setReports(list => [report,...list]); setSelected(report.id); setForm(false); notify(`${report.id} berhasil dibuat.`);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><b>KM</b><div><strong>KSP Mendekat</strong><span>Kendali laporan</span></div></div>
      <nav aria-label="Navigasi utama">{[["ringkasan","Ringkasan","01"],["antrean","Antrean kerja","02"],["analitik","Analitik","03"]].map(([id,label,no]) => <button key={id} className={view===id?"nav active":"nav"} onClick={()=>setView(id)}><span>{no}</span>{label}</button>)}</nav>
      <div className="simulation"><i/><div><strong>Simulasi aktif</strong><p>Semua nama dan data bersifat fiktif.</p></div></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">Minggu operasional · 21–27 Juli 2026</p><h1>{view==="ringkasan"?"Keadaan layanan hari ini":view==="antrean"?"Antrean laporan":"Pola dan beban penanganan"}</h1></div><div className="actions"><div className="user"><b>MP</b><span><strong>Maya Putri</strong><small>Supervisor</small></span></div><button className="primary" onClick={()=>setForm(true)}>＋ Tambah laporan</button></div></header>

      {view === "ringkasan" && <>
        <section className="metrics"><Metric label="Backlog aktif" value={activeReports.length} note="laporan perlu tindakan" tone="ink"/><Metric label="Lewat target" value={overdue.length} note="target internal manual" tone="red"/><Metric label="Tanpa update ≥7 hari" value={stale.length} note="perlu perhatian supervisor" tone="amber"/><Metric label="Selesai / ditutup" value={resolved.length} note="dalam data simulasi" tone="teal"/></section>
        <section className="aging"><Heading eyebrow="Sinyal utama" title="Umur backlog aktif"><p>Pita menunjukkan berapa lama laporan belum mencapai tahap selesai.</p></Heading><div className="ribbon">{bands.map(([label,min,max,tone]) => { const count=activeReports.filter(r=>age(r.receivedAt)>=min&&age(r.receivedAt)<=max).length; return <button key={label} className={tone} onClick={()=>{setView("antrean");notify(`Membuka antrean umur ${label}.`)}}><strong>{count}</strong><span>{label}</span></button> })}</div></section>
        <div className="dashboard-grid"><section className="panel"><PanelHead eyebrow="Prioritas kerja" title="Perlu tindakan berikutnya"><button className="link" onClick={()=>setView("antrean")}>Buka semua →</button></PanelHead><ReportTable reports={activeReports.slice(0,4)} onSelect={setSelected} compact/></section><section className="panel chart-panel"><PanelHead eyebrow="7 hari terakhir" title="Masuk dan selesai"><div className="legend"><i/>Masuk <i/>Selesai</div></PanelHead><div className="weekly">{[["Sen",4,2],["Sel",7,3],["Rab",5,4],["Kam",8,5],["Jum",6,4],["Sab",3,2],["Min",2,3]].map(([day,incoming,done])=><div key={day}><span className="bars"><i style={{height:`${Number(incoming)*10}px`}}/><i style={{height:`${Number(done)*10}px`}}/></span><small>{day}</small></div>)}</div><p className="chart-note">Penyelesaian belum mengejar volume masuk pada empat hari kerja pertama.</p></section></div>
      </>}

      {view === "antrean" && <section className="panel queue"><div className="toolbar"><label>⌕<input aria-label="Cari laporan" placeholder="Cari nomor, pelapor, kategori, atau petugas" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Semua status</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span>{visible.length} laporan</span></div><ReportTable reports={visible} onSelect={setSelected}/></section>}

      {view === "analitik" && <div className="analytics"><section className="panel"><PanelHead eyebrow="Komposisi" title="Laporan menurut kategori"><small>n = {reports.length}</small></PanelHead><div className="category-list">{Object.entries(categories).map(([category,count])=><div key={category}><span>{category}</span><b><i style={{width:`${Math.max(12,count/reports.length*100)}%`}}/></b><strong>{count}</strong></div>)}</div></section><section className="panel"><PanelHead eyebrow="Alur kerja" title="Distribusi status"/><div className="status-list">{Object.entries(labels).map(([status])=><div key={status}><Badge status={status as Status}/><strong>{reports.filter(r=>r.status===status).length}</strong></div>)}</div></section><section className="panel insights"><Heading eyebrow="Bacaan awal" title="Tiga hal yang perlu diperiksa"/><ol><Insight n="01" title="Target internal belum merata">Laporan tanpa due date belum dapat dinilai lewat target.</Insight><Insight n="02" title="Kasus lama tertahan">Periksa laporan berumur lebih dari tujuh hari tanpa pembaruan.</Insight><Insight n="03" title="Resolved berbeda dari closed">Konfirmasi hasil diperlukan sebelum laporan benar-benar ditutup.</Insight></ol></section></div>}
    </section>

    {current && <div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><aside className="drawer"><div className="drawer-head"><div><p className="eyebrow">{current.id}</p><h2>{current.title}</h2></div><button aria-label="Tutup detail" onClick={()=>setSelected(null)}>×</button></div><div className="badges"><Badge status={current.status}/><span className="priority">{current.priority}</span></div><p className="summary">{current.summary}</p><dl className="details"><Detail label="Pelapor" value={current.reporter}/><Detail label="Kontak" value={current.contact}/><Detail label="Penanggung jawab" value={current.handler}/><Detail label="Lokasi kegiatan" value={current.location}/><Detail label="Diterima" value={shortDate(current.receivedAt)}/><Detail label="Target internal" value={current.dueAt?shortDate(current.dueAt):"Belum ditetapkan"}/></dl><section className="timeline"><Heading eyebrow="Jejak penanganan" title="Timeline"/><ol>{[...current.timeline].reverse().map(item=><li key={item.date+item.label}><i/><div><span>{item.date}</span><strong>{item.label}</strong><p>{item.note}</p></div></li>)}</ol></section>{nextStatus(current.status)&&<button className="advance" onClick={()=>advance(current)}>Pindahkan ke {labels[nextStatus(current.status) as Status]} <span>→</span></button>}</aside></div>}

    {form && <div className="backdrop modal-wrap"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="drawer-head"><div><p className="eyebrow">Entry laporan</p><h2 id="form-title">Catat laporan baru</h2></div><button aria-label="Tutup formulir" onClick={()=>setForm(false)}>×</button></div><form onSubmit={submit}><div className="form-grid"><Field label="Nama pelapor" name="reporter" placeholder="Nama lengkap"/><Field label="Kontak" name="contact" placeholder="Nomor telepon atau email"/><Field wide label="Judul laporan" name="title" placeholder="Ringkas masalah dalam satu kalimat"/><label>Kategori<select name="category" required defaultValue=""><option value="" disabled>Pilih kategori</option>{["Kesehatan","Pendidikan","Ekonomi rakyat","Pertanian","Perumahan","Pertanahan"].map(x=><option key={x}>{x}</option>)}</select></label><label>Prioritas<select name="priority" defaultValue="Normal">{["Mendesak","Tinggi","Normal","Rendah"].map(x=><option key={x}>{x}</option>)}</select></label><Field wide label="Lokasi kegiatan" name="location" placeholder="Contoh: KSP Mendekat — Bandung"/><label className="wide">Uraian singkat<textarea name="summary" required rows={4} placeholder="Jelaskan kebutuhan pelapor dan konteks penting."/></label></div><footer><p>Data baru tersimpan hanya selama halaman simulasi masih terbuka.</p><div><button type="button" onClick={()=>setForm(false)}>Batal</button><button className="primary" type="submit">Simpan laporan</button></div></footer></form></section></div>}
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function Metric({label,value,note,tone}:{label:string;value:number;note:string;tone:string}) { return <article className={`metric ${tone}`}><span>{label}</span><strong>{String(value).padStart(2,"0")}</strong><small>{note}</small></article> }
function Heading({eyebrow,title,children}:{eyebrow:string;title:string;children?:React.ReactNode}) { return <header className="heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{children}</header> }
function PanelHead({eyebrow,title,children}:{eyebrow:string;title:string;children?:React.ReactNode}) { return <header className="panel-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{children}</header> }
function Badge({status}:{status:Status}) { return <span className={`badge ${tones[status]}`}>{labels[status]}</span> }
function Detail({label,value}:{label:string;value:string}) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function Insight({n,title,children}:{n:string;title:string;children:React.ReactNode}) { return <li><span>{n}</span><div><strong>{title}</strong><p>{children}</p></div></li> }
function Field({label,name,placeholder,wide=false}:{label:string;name:string;placeholder:string;wide?:boolean}) { return <label className={wide?"wide":""}>{label}<input name={name} required placeholder={placeholder}/></label> }
function ReportTable({reports,onSelect,compact=false}:{reports:Report[];onSelect:(id:string)=>void;compact?:boolean}) { return <div className="table-wrap"><table className={compact?"compact":""}><thead><tr><th>Laporan</th><th>Status</th><th>Petugas</th><th>Umur</th>{!compact&&<th>Target</th>}</tr></thead><tbody>{reports.map(r=><tr key={r.id} tabIndex={0} onClick={()=>onSelect(r.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onSelect(r.id)}}><td><span className="report"><small>{r.id}</small><strong>{r.title}</strong><em>{r.category} · {r.reporter}</em></span></td><td><Badge status={r.status}/></td><td>{r.handler}</td><td><span className={age(r.receivedAt)>14?"age late":"age"}>{age(r.receivedAt)} hari</span></td>{!compact&&<td>{r.dueAt?shortDate(r.dueAt):"Belum ada"}</td>}</tr>)}</tbody></table>{reports.length===0&&<div className="empty"><strong>Tidak ada laporan yang cocok</strong><p>Ubah pencarian atau filter status.</p></div>}</div> }

