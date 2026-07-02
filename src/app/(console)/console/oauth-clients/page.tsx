import { redirect } from "next/navigation";

// OAuth clients live under /console/applications — keep the nav-link stable
// and just forward here.
export default function OAuthClientsPage() {
  redirect("/console/applications");
}
