// Remounts when you move to another section, so each one fades in (no motion if the system asks for less).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
