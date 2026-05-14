type DashboardGreetingProps = {
  name: string;
};

export function DashboardGreeting({ name }: DashboardGreetingProps) {
  return (
    <h1 className="text-3xl font-bold text-maps-heading">
      Hola, {name} <span aria-hidden>👋</span>
    </h1>
  );
}
