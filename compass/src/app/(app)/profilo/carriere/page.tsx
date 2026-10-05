import { redirect } from "next/navigation";

/** Careers are chosen in Posizioni cercate, countries in Dove. */
export default function CarrierePage() {
  redirect("/profilo/posizioni");
}
