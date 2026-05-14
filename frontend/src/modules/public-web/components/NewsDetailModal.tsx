import { useState } from 'react';
import { FaWhatsapp, FaLinkedinIn, FaLink, FaClock } from 'react-icons/fa';
import { Modal } from '@/shared/components/Modal';
import { useNewsModalStore } from '@/shared/store/newsModalStore';
import type { NewsItem } from '@/shared/types/news';

const relatedNews: NewsItem[] = [
  {
    category: 'Seguridad',
    date: 'Hace 3 días',
    title: 'Nuevas normativas de ciberseguridad 2024',
    href: '#',
    imageGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
  },
  {
    category: 'Tendencias',
    date: 'Hace 1 semana',
    title: 'El futuro del corretaje digital',
    href: '#',
    imageGradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
  },
];

export function NewsDetailModal() {
  const { isOpen, selectedNews, closeModal } = useNewsModalStore();
  const [copied, setCopied] = useState(false);

  if (!selectedNews) return null;

  const handleShareClick = (platform: 'whatsapp' | 'linkedin') => {
    const url = window.location.href;
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(selectedNews.title + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const shareContent = (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted mb-1">
        Compartir
      </p>
      <button
        onClick={() => handleShareClick('whatsapp')}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-semibold w-full"
      >
        <FaWhatsapp size={16} />
        WhatsApp
      </button>
      <button
        onClick={() => handleShareClick('linkedin')}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors text-sm font-semibold w-full"
      >
        <FaLinkedinIn size={16} />
        LinkedIn
      </button>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-maps-surface text-maps-muted hover:bg-maps-border/40 transition-colors text-sm font-semibold w-full"
      >
        <FaLink size={13} />
        {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
      </button>
    </div>
  );

  const relatedContent = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted mb-1">
        Relacionados
      </p>
      {relatedNews.map((article) => (
        <button
          key={article.title}
          onClick={() => {}}
          className="flex gap-3 group text-left w-full rounded-xl p-2 -mx-2 hover:bg-maps-surface transition-colors"
        >
          <div
            className="w-[52px] h-[52px] rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.04]"
            style={{ background: article.imageGradient }}
            aria-hidden
          />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-[9.5px] font-black uppercase tracking-[0.18em] text-maps-brand">
              {article.category}
            </p>
            <p className="text-[13px] font-semibold text-maps-heading group-hover:text-maps-brand transition-colors leading-snug line-clamp-2">
              {article.title}
            </p>
            <p className="text-[11px] text-maps-muted mt-0.5">{article.date}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={closeModal} maxWidth="max-w-5xl">
      {/*
        Hero spans full modal width at the top. Everything else stacks
        below it in a single scrolling column.
      */}
      <div className="flex flex-col lg:h-full lg:overflow-y-auto">
        {/* Hero with title overlay — full width */}
        <div
          className="relative h-[260px] sm:h-[320px] w-full flex-shrink-0 overflow-hidden"
          style={{ background: selectedNews.imageGradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] text-white bg-maps-brand rounded-full px-3 py-1">
                {selectedNews.category}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-maps-heading bg-white/95 rounded-full px-3 py-1">
                <FaClock size={10} />5 min lectura
              </span>
            </div>
            <h1 className="text-white font-bold text-[1.5rem] sm:text-[1.85rem] leading-[1.2] drop-shadow-sm">
              {selectedNews.title}
            </h1>
          </div>
        </div>

        {/* Article content */}
        <article className="min-w-0">
          {/* Author bar */}
          <div className="flex items-center gap-3 px-5 sm:px-6 pt-5 pb-4">
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-maps-border/60" />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-maps-heading leading-tight">
                Equipo Editorial MAPS
              </p>
              <p className="text-[11.5px] text-maps-muted mt-0.5">
                Publicado el 24 de Octubre, 2023
              </p>
            </div>
          </div>

          {/* Article prose */}
          <div className="px-5 sm:px-6 pt-2 pb-6 text-[14px] text-maps-body leading-[1.85] space-y-4">
            <p>
              La inteligencia artificial está transformando radicalmente la forma en que se procesan
              las reclamaciones de seguros. Al aprovechar los algoritmos de aprendizaje automático,
              las empresas ahora pueden predecir patrones de fraude y automatizar evaluaciones de
              rutina con una precisión sin precedentes. Este cambio de paradigma no solo reduce los
              costos operativos sino que también mejora significativamente la experiencia del
              cliente al acelerar los tiempos de respuesta.
            </p>

            <h3 className="text-[16px] font-bold text-maps-heading !mt-6 !mb-2">
              Automatización Inteligente
            </h3>
            <p>
              Tradicionalmente, la gestión de siniestros ha sido un proceso manual, propenso a
              errores y demoras. Con la integración de modelos de visión por computadora, MAPS
              Asesores está revolucionando cómo se evalúan los daños. Los algoritmos pueden analizar
              fotografías de siniestros y generar reportes detallados automáticamente, acelerando el
              proceso de liquidación de días a apenas horas.
            </p>
            <p>
              Además, los sistemas de procesamiento de lenguaje natural permiten leer y categorizar
              automáticamente la documentación adjunta a cada siniestro, extrayendo información
              clave sin intervención humana. Esto elimina gran parte del trabajo repetitivo y
              permite que los ajustadores se concentren en los casos más complejos que genuinamente
              requieren criterio profesional.
            </p>

            <h3 className="text-[16px] font-bold text-maps-heading !mt-6 !mb-2">
              Detección Temprana de Fraude
            </h3>
            <p>
              Uno de los beneficios más impactantes de la IA en el sector asegurador es la capacidad
              de detectar patrones de fraude antes de que se procesen los pagos. Los modelos
              entrenados con millones de reclamaciones históricas pueden identificar anomalías
              sutiles que escaparían a la revisión humana convencional. Según estudios recientes,
              las aseguradoras que implementan estas soluciones reducen las pérdidas por fraude
              entre un 25 y un 40 por ciento.
            </p>
            <p>
              En MAPS Asesores, el sistema analiza más de 200 variables por cada reclamación en
              tiempo real, cruzando datos de historial del asegurado, geolocalización, patrones
              climáticos y comportamiento de pago. Esta combinación de factores permite generar un
              score de riesgo que orienta a los equipos de investigación hacia los casos más
              sospechosos.
            </p>

            <h3 className="text-[16px] font-bold text-maps-heading !mt-6 !mb-2">
              Beneficios para Productores
            </h3>
            <p>
              Los asesores y corredores que trabajan con MAPS pueden ofrecer a sus clientes un
              servicio más rápido, eficiente y confiable. Esto no solo mejora la experiencia del
              cliente, sino que también permite que los profesionales del sector enfoquen su tiempo
              en tareas de mayor valor agregado, como la consultoría personalizada y la gestión de
              relaciones a largo plazo.
            </p>
            <p>
              La plataforma también ofrece dashboards en tiempo real donde los productores pueden
              monitorear el estado de cada siniestro, recibir alertas automáticas sobre
              actualizaciones importantes y comunicarse directamente con el equipo de liquidación.
              Esta transparencia genera confianza tanto en los asesores como en sus clientes
              finales.
            </p>

            <h3 className="text-[16px] font-bold text-maps-heading !mt-6 !mb-2">
              El Futuro del Sector
            </h3>
            <p>
              A medida que la tecnología continúa evolucionando, se espera que la IA juegue un rol
              aún más central en el sector asegurador argentino. MAPS Asesores está invirtiendo
              activamente en investigación y desarrollo para incorporar modelos generativos que
              puedan redactar comunicaciones personalizadas, sugerir coberturas óptimas basadas en
              el perfil de riesgo de cada cliente, y anticipar necesidades antes de que el propio
              asegurado las identifique.
            </p>
            <p>
              La convergencia de big data, computación en la nube y aprendizaje profundo está
              creando oportunidades sin precedentes para reinventar la industria. Las empresas que
              adopten estas tecnologías hoy estarán mejor posicionadas para competir en el mercado
              de la próxima década.
            </p>
          </div>

          {/* Share + related below article */}
          <div className="px-5 sm:px-6 pb-6 pt-5 space-y-5 border-t border-maps-border mt-2">
            <div className="grid gap-6 sm:grid-cols-2">
              {shareContent}
              {relatedContent}
            </div>
          </div>
        </article>
      </div>
    </Modal>
  );
}
