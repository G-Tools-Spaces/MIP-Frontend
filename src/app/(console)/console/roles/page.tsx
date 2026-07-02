"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, Trash2, Edit3 } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { rbacApi, type Role, type Permission } from "@/lib/api/endpoints/rbac";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  defaultRole: z.boolean().default(false),
  permissionCodes: z.array(z.string()),
});
type Values = {
  name: string;
  description?: string;
  defaultRole: boolean;
  permissionCodes: string[];
};

export default function RolesPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: () => rbacApi.listPermissions(),
  });
  const rolesQuery = useQuery({
    queryKey: ["roles", orgId],
    queryFn: () => rbacApi.listRoles(orgId!),
    enabled: !!orgId,
  });

  const [editing, setEditing] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    reset({
      name: "",
      description: "",
      defaultRole: false,
      permissionCodes: [],
    });
    setDialogOpen(true);
  };
  const openEdit = (r: Role) => {
    setEditing(r);
    reset({
      name: r.name,
      description: r.description ?? "",
      defaultRole: r.defaultRole,
      permissionCodes: r.permissionCodes,
    });
    setDialogOpen(true);
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema) as unknown as import("react-hook-form").Resolver<Values>,
    defaultValues: {
      name: "",
      description: "",
      defaultRole: false,
      permissionCodes: [],
    },
  });

  const selectedCodes =
    useWatch({ control, name: "permissionCodes" }) ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    (permissionsQuery.data ?? []).forEach((p) => {
      const g = map.get(p.domain) ?? [];
      g.push(p);
      map.set(p.domain, g);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissionsQuery.data]);

  const togglePermission = (code: string) => {
    const set = new Set(selectedCodes);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    setValue("permissionCodes", Array.from(set), { shouldDirty: true });
  };

  const saveMutation = useMutation({
    mutationFn: (values: Values) => {
      const payload = {
        ...values,
        description: values.description || undefined,
      };
      return editing
        ? rbacApi.updateRole(orgId!, editing.id, payload)
        : rbacApi.createRole(orgId!, payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Role updated" : "Role created");
      qc.invalidateQueries({ queryKey: ["roles", orgId] });
      setDialogOpen(false);
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(orgId!, id),
    onSuccess: () => {
      toast.success("Role deleted");
      qc.invalidateQueries({ queryKey: ["roles", orgId] });
    },
    onError: (e: ApiError) => toast.error(e.problem.detail ?? e.problem.title),
  });

  if (!orgId) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Roles & Permissions" description="RBAC" />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to manage roles.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Roles & Permissions"
        description="Compose fine-grained access with domain:resource:action grants."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New role
          </Button>
        }
      />

      {rolesQuery.isLoading && <Skeleton className="h-40" />}

      {rolesQuery.data && rolesQuery.data.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No custom roles yet"
          description="Create a role to bundle permissions and assign them to members."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New role
            </Button>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rolesQuery.data?.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" /> {r.name}
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500 truncate">
                  {r.description ?? "—"}
                </p>
              </div>
              <div className="flex gap-1">
                {r.system && <Badge tone="violet">system</Badge>}
                {r.defaultRole && <Badge tone="sky">default</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {r.permissionCodes.slice(0, 8).map((c) => (
                  <Badge key={c} tone="neutral">
                    {c}
                  </Badge>
                ))}
                {r.permissionCodes.length > 8 && (
                  <Badge tone="neutral">
                    +{r.permissionCodes.length - 8} more
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(r)}
                  disabled={r.system}
                >
                  <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={r.system}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit “${editing.name}”` : "New role"}
        description="Give this role a clear name and pick the permissions it grants."
        className="max-w-3xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              form="role-form"
              type="submit"
              loading={saveMutation.isPending}
            >
              {editing ? "Save changes" : "Create role"}
            </Button>
          </>
        }
      >
        <form
          id="role-form"
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="name">Role name</Label>
              <Input
                id="name"
                placeholder="Support Agent"
                invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </Field>
            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What this role lets someone do…"
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Permissions ({selectedCodes.length} selected)
            </div>
            <div className="max-h-72 overflow-y-auto p-3 space-y-4">
              {permissionsQuery.isLoading && <Skeleton className="h-24" />}
              {grouped.map(([domain, perms]) => (
                <div key={domain}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {domain}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({perms.length})
                    </span>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {perms.map((p) => {
                      const active = selectedCodes.includes(p.code);
                      return (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => togglePermission(p.code)}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full ring-1",
                              active
                                ? "bg-indigo-600 ring-indigo-600"
                                : "bg-white ring-slate-300 dark:bg-slate-900 dark:ring-slate-700",
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block font-mono text-[11px]">
                              {p.code}
                            </span>
                            {p.description && (
                              <span className="block text-slate-500">
                                {p.description}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
