import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { Alert } from "@/components/admin/ui";

export default async function NoPermission({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="red">
        <b>Acesso negado.</b> Seu perfil não tem a permissão {p && p in PERMISSIONS ? <>“{PERMISSIONS[p as Permission]}”</> : "necessária"}. Solicite ao proprietário da loja.
      </Alert>
    </div>
  );
}
