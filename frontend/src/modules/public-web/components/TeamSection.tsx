import avatar1 from '@/assets/images/avatar-1.jpg';
import avatar2 from '@/assets/images/avatar-2.jpg';
import avatar3 from '@/assets/images/avatar-3.jpg';

type Member = {
  name: string;
  role: string;
  avatar: string;
};

const members: Member[] = [
  { name: 'Carlos Rivera', role: 'Asesor Senior', avatar: avatar1 },
  { name: 'Lucía Méndez', role: 'Asesora', avatar: avatar2 },
  { name: 'Martín Torres', role: 'Asesor', avatar: avatar3 },
];

export function TeamSection() {
  return (
    <section id="equipo" className="bg-maps-surface px-4 sm:px-6 lg:px-10 pb-20 sm:pb-24 lg:pb-32 pt-16 sm:pt-20 lg:pt-24">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-12">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Conoce a nuestro equipo
          </h2>
          <p className="mx-auto mt-4 max-w-[571px] text-lg leading-[28px] text-maps-muted">
            Profesionales con experiencia comprometidos a brindarte el mejor
            servicio y la atención que mereces.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {members.map((member) => (
            <article
              key={member.name}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 shadow-card"
            >
              <div className="h-32 w-32 overflow-hidden rounded-full bg-maps-brand-soft">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="mt-6 text-2xl font-bold leading-[32px] text-maps-heading">
                {member.name}
              </h3>
              <p className="text-base text-maps-muted">{member.role}</p>
              <button
                type="button"
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg bg-maps-brand text-base font-bold text-white transition-colors hover:bg-maps-brand-hover"
              >
                Ver Perfil
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
