/**
 * Dashboard principal de gestión de Noticias en `/admin/noticias`.
 * Combina formulario CRUD, tabla con filtros client-side, modales y feedback al usuario.
 */
import { useMemo, useRef, useState } from 'react';

import { Filter } from 'lucide-react';

import { TablePagination } from '@/shared/components/TablePagination';

import {

  MapsFeedbackToastHost,

  useMapsFeedback,

} from '@/shared/components/MapsFeedbackToast';

import { getApiErrorMessage } from '@/modules/admin/lib/apiError';

import { PartialCreateError, useAdminNews } from '@/modules/admin/hooks/useAdminNews';

import { useNewsFilters } from '@/modules/admin/hooks/useNewsFilters';

import { NewsHeader } from '@/modules/admin/components/NewsHeader';

import { NewsTabs, type NewsTab } from '@/modules/admin/components/NewsTabs';

import {

  EMPTY_FORM,

  NewsForm,

  type NewsFormState,

  type NewsImageOps,

} from '@/modules/admin/components/NewsForm';

import { RecentNewsTable } from '@/modules/admin/components/RecentNewsTable';

import { NewsFilterModal } from '@/modules/admin/components/NewsFilterModal';

import { NewsViewModal } from '@/modules/admin/components/NewsViewModal';

import { NewsDeleteConfirmModal } from '@/modules/admin/components/NewsDeleteConfirmModal';

import type { News, NewsInput } from '@/modules/admin/types/news';



function newsToFormState(n: News): NewsFormState {

  return {

    titulo: n.titulo,

    descripcion: n.descripcion ?? '',

    categoria: n.categoria,

    audiencia: n.audiencia,

    cuerpo: n.cuerpo,

    imagenPortada: n.imagenPortada,

    portadaFile: null,

    removePortada: false,

    portadaCrop: n.portadaEncuadre ?? null,

    galeria: n.galeria,

    galeriaNuevas: [],

    galeriaEliminar: [],

    galeriaOrder: n.galeria.map((img) => `p:${img.id}`),

    estado: n.estado,

    ultimaModificacion: n.ultimaModificacion,

  };

}



export function NewsManagementDashboard() {

  const {

    news,

    loading,

    error,

    refetch,

    getNewsDetail,

    createNews,

    updateNews,

    deleteNews,

    unpublishNews,

  } = useAdminNews();



  const { toast, dismiss, showSuccess, showError } = useMapsFeedback();



  const filtersHook = useNewsFilters();

  const { filters, setFilter, reset, apply, activeCount } = filtersHook;



  const [activeTab, setActiveTab] = useState<NewsTab>('crear');

  const [formState, setFormState] = useState<NewsFormState>(EMPTY_FORM);

  const [editing, setEditing] = useState<News | null>(null);

  const [formResetKey, setFormResetKey] = useState(0);

  const formSectionRef = useRef<HTMLDivElement>(null);



  const [viewing, setViewing] = useState<News | null>(null);

  const [deleting, setDeleting] = useState<News | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);



  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(8);



  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const actionLockRef = useRef(false);
  const editRequestIdRef = useRef(0);



  const filtered = useMemo(() => apply(news), [apply, news]);



  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(

    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),

    [filtered, safePage, pageSize],

  );



  function resetFormAfterSuccess(ultimaModificacion?: string) {

    setEditing(null);

    setFormState({

      ...EMPTY_FORM,

      ultimaModificacion: ultimaModificacion ?? new Date().toISOString(),

    });

    setFormResetKey((k) => k + 1);

    setFormError(null);

  }



  function scrollToForm() {
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        document.getElementById('news-titulo')?.focus({ preventScroll: true });
      }, 350);
    });
  }

  async function handleEdit(n: News) {
    const requestId = ++editRequestIdRef.current;
    setFormError(null);
    setActionError(null);

    try {
      const detail = await getNewsDetail(n.id);
      if (requestId !== editRequestIdRef.current) return;
      setEditing(detail);
      setFormState(newsToFormState(detail));
      setActiveTab('crear');
      scrollToForm();
    } catch (err) {
      if (requestId !== editRequestIdRef.current) return;
      setFormError(getApiErrorMessage(err));
      showError('No se pudo cargar la noticia para editar');
    }
  }



  function handleCancelEdit() {

    setEditing(null);

    setFormState({ ...EMPTY_FORM, ultimaModificacion: new Date().toISOString() });

    setFormResetKey((k) => k + 1);

    setFormError(null);

  }



  async function handleSubmit(input: NewsInput, images: NewsImageOps) {
    setFormSubmitting(true);
    setFormError(null);
    setActionError(null);
    const publicada = input.estado === 'PUBLICADO';
    const previousEstado = editing?.estado;

    try {
      if (editing) {
        const updated = await updateNews(editing.id, input, publicada, images);
        resetFormAfterSuccess(updated.ultimaModificacion);
        if (publicada) {
          showSuccess('Noticia publicada');
        } else if (previousEstado === 'BORRADOR') {
          showSuccess('Borrador guardado');
        } else {
          showSuccess('Cambios guardados');
        }
      } else {
        await createNews(input, publicada, images);
        setPage(1);
        resetFormAfterSuccess();
        showSuccess(publicada ? 'Noticia publicada' : 'Noticia creada correctamente');
      }
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setFormError(msg);
      showError('No se pudo completar la acción');
      if (err instanceof PartialCreateError) {
        // El texto ya se creó pero falló una imagen: pasar a edición sobre esa
        // noticia para que reintentar la actualice en vez de duplicarla.
        const created = err.createdNews;
        setEditing(created);
        setPage(1);
        setFormState((prev) => ({
          ...newsToFormState(created),
          portadaFile: prev.portadaFile,
          removePortada: prev.removePortada,
          galeriaNuevas: prev.galeriaNuevas,
          galeriaEliminar: prev.galeriaEliminar,
          galeriaOrder: prev.galeriaOrder,
        }));
      }
      throw err;
    } finally {
      setFormSubmitting(false);
    }
  }



  async function handleUnpublishFromForm() {

    if (!editing) return;

    setFormSubmitting(true);

    setFormError(null);

    setActionError(null);



    try {

      await unpublishNews(editing.id);

      resetFormAfterSuccess();

      showSuccess('Noticia despublicada');

    } catch (err) {

      const msg = getApiErrorMessage(err);

      setFormError(msg);

      showError('No se pudo completar la acción');

    } finally {

      setFormSubmitting(false);

    }

  }



  async function handleUnpublishFromTable(n: News) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;

    setActionBusy(true);

    setActionError(null);



    try {

      await unpublishNews(n.id);

      if (editing?.id === n.id) {

        handleCancelEdit();

      }

      showSuccess('Noticia despublicada');

    } catch (err) {

      const msg = getApiErrorMessage(err);

      setActionError(msg);

      showError('No se pudo completar la acción');

    } finally {
      actionLockRef.current = false;

      setActionBusy(false);

    }

  }



  async function handleConfirmDelete(n: News) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;

    setActionBusy(true);

    setActionError(null);



    try {

      await deleteNews(n.id);

      if (editing?.id === n.id) {

        handleCancelEdit();

      }

      setDeleting(null);

      showSuccess('Noticia eliminada');

    } catch (err) {

      const msg = getApiErrorMessage(err);

      setActionError(msg);

      showError('No se pudo completar la acción');

    } finally {
      actionLockRef.current = false;

      setActionBusy(false);

    }

  }



  const formKey = editing?.id ?? `create-${formResetKey}`;



  return (

    <div className="flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-6">

      <MapsFeedbackToastHost toast={toast} onDismiss={dismiss} />



      <NewsHeader />

      <NewsTabs active={activeTab} onChange={setActiveTab} />



      {error ? (

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">

          <span>{error}</span>

          <button

            type="button"

            onClick={() => void refetch()}

            className="font-semibold underline"

          >

            Reintentar

          </button>

        </div>

      ) : null}



      {formError ? (

        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">

          {formError}

        </p>

      ) : null}



      {actionError ? (

        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">

          {actionError}

        </p>

      ) : null}



      {activeTab === 'crear' ? (

        <div ref={formSectionRef} className="scroll-mt-6">

        <NewsForm

          key={formKey}

          mode={editing ? 'edit' : 'create'}

          state={formState}

          isSubmitting={formSubmitting}

          onChange={setFormState}

          onSubmit={handleSubmit}

          onUnpublish={editing?.estado === 'PUBLICADO' ? handleUnpublishFromForm : undefined}

          onCancelEdit={editing ? handleCancelEdit : undefined}

        />

        </div>

      ) : null}



      <section className="flex flex-col gap-3">

        <div className="flex items-end justify-between gap-3">

          <h2 className="text-lg font-semibold text-maps-heading">Noticias Recientes</h2>

          <button

            type="button"

            onClick={() => setFilterOpen(true)}

            className="inline-flex items-center gap-2 rounded-lg border border-maps-border bg-white px-3 py-2 text-sm font-medium text-maps-body shadow-card transition hover:bg-maps-surface"

          >

            <Filter size={14} strokeWidth={1.75} />

            Filtrar

            {activeCount > 0 ? (

              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-maps-brand px-1.5 text-[11px] font-semibold text-white">

                {activeCount}

              </span>

            ) : null}

          </button>

        </div>



        {loading ? (

          <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">

            Cargando noticias…

          </div>

        ) : (

          <>

            <RecentNewsTable

              news={paginated}

              onView={(n) => setViewing(n)}

              onEdit={handleEdit}

              onDelete={(n) => setDeleting(n)}

              onUnpublish={(n) => void handleUnpublishFromTable(n)}

            />



            {filtered.length > 0 ? (

              <TablePagination

                page={safePage}

                totalPages={totalPages}

                pageSize={pageSize}

                totalItems={filtered.length}

                onPageChange={setPage}

                onPageSizeChange={(s) => {

                  setPageSize(s);

                  setPage(1);

                }}

              />

            ) : null}

          </>

        )}

      </section>



      <NewsFilterModal

        isOpen={filterOpen}

        initialFilters={filters}

        onClose={() => setFilterOpen(false)}

        onApply={(next) => {

          (Object.keys(next) as (keyof typeof next)[]).forEach((k) => setFilter(k, next[k]));

          setPage(1);

        }}

        onReset={() => {

          reset();

          setPage(1);

        }}

      />



      <NewsViewModal

        isOpen={viewing !== null}

        news={viewing}

        onClose={() => setViewing(null)}

        onEdit={handleEdit}

      />



      <NewsDeleteConfirmModal

        isOpen={deleting !== null}

        news={deleting}

        isBusy={actionBusy}

        onClose={() => {

          if (!actionBusy) setDeleting(null);

        }}

        onConfirm={(n) => void handleConfirmDelete(n)}

      />

    </div>

  );

}

