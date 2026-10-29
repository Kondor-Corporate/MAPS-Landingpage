/** Punto de entrada de la ruta admin; delega en el dashboard de gestión. */
import { NewsManagementDashboard } from '@/modules/admin/components/NewsManagementDashboard';

export function NewsManagementPage() {
  return <NewsManagementDashboard />;
}
