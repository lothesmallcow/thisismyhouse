import { redirect } from "next/navigation";

// The old address of "Non mi interessano".
export default function ScartateRedirect() {
  redirect("/offerte/non-mi-interessano");
}
