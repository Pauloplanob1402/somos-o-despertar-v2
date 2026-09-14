import { USUARIOS } from "@/lib/mock-data";
import { PersonRow } from "@/components/PersonRow";

export default function PessoasPage() {
  return (
    <section className="view">
      <div className="topo-secao">
        <h2>Pessoas</h2>
        <div className="sub">Conecte-se com quem também está despertando</div>
      </div>
      <div className="grade-secao">
        <div className="grade-pessoas">
          {USUARIOS.map((u) => (
            <PersonRow key={u.id} usuario={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
