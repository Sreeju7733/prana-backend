import { redirect } from "next/navigation";

export default function HospitalRedirect() {
  redirect("/hospitals/login");
}
