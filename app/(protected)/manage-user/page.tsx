import { redirect } from "next/navigation";

export default function ManageUser() {
  redirect("/business-settings/all-users");
}
