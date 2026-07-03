"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/console/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  invitationsApi,
  type Invitation,
  type InvitationStatus,
  type MembershipRoleName,
} from "@/lib/api/endpoints/invitations";
import { ApiError } from "@/lib/api/problem";
import { useCurrentOrgId } from "@/stores/session-store";
import { dateTime, relativeTime } from "@/lib/format";

/**
 * Invitations page.
 *
 * Backend contract notes (see `OrganizationInvitationController`):
 *   * List path is /api/v1/organizations/invitations/organization/{orgId}
 *     (NOT /api/v1/organizations/{orgId}/invitations — that path 404s and was
 *     the cause of the `Static resource not found` log spam).
 *   * The invite payload takes a `MembershipRole` enum, not a role UUID.
 *     Values: OWNER | ADMIN | MEMBER | GUEST.
 *   * Server infers expiration from application config; no `expiresInHours`
 *     field is accepted today.
 *   * There is no /resend endpoint yet — Revoke and re-invite is the flow.
 */

const invitationSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});
type InviteValues = {
  email: string;
  role: MembershipRoleName;
};

const statusTone: Record<
  InvitationStatus,
  Parameters<typeof Badge>[0]["tone"]
> = {
  PENDING: "amber",
  ACCEPTED: "emerald",
  EXPIRED: "neutral",
  REVOKED: "red",
};

export default function InvitationsPage() {
  const orgId = useCurrentOrgId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const invitationsQuery = useQuery({
    queryKey: ["invitations", orgId],
    queryFn: () => invitationsApi.list(orgId!),
    enabled: !!orgId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(
      invitationSchema,
    ) as unknown as import("react-hook-form").Resolver<InviteValues>,
    defaultValues: { email: "", role: "MEMBER" },
  });

  const createMutation = useMutation({
    mutationFn: (v: InviteValues) =>
      invitationsApi.create({
        organizationId: orgId!,
        email: v.email,
        role: v.role,
      }),
    onSuccess: () => {
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["invitations", orgId] });
      setOpen(false);
      reset();
    },
    onError: (err: ApiError) => {
      toast.error(
        err.status === 409
          ? "That email is already invited or a member."
          : (err.problem.detail ?? err.problem.title),
      );
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["invitations", orgId] });
    },
    onError: (err: ApiError) =>
      toast.error(err.problem.detail ?? err.problem.title),
  });

  const columns: Column<Invitation>[] = [
    {
      key: "email",
      header: "Email",
      render: (r) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {r.email}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge>,
    },
    {
      key: "role",
      header: "Role",
      render: (r) => r.role ?? "—",
    },
    {
      key: "expires",
      header: "Expires",
      render: (r) => (
        <span
          title={dateTime(r.expiresAt)}
          className="text-slate-500 dark:text-slate-400"
        >
          {relativeTime(r.expiresAt)}
        </span>
      ),
    },
    {
      key: "sent",
      header: "Sent",
      render: (r) => (
        <span
          title={dateTime(r.createdAt)}
          className="text-slate-500 dark:text-slate-400"
        >
          {relativeTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              loading={
                revokeMutation.isPending && revokeMutation.variables === r.id
              }
              onClick={() => revokeMutation.mutate(r.id)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!orgId) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Invitations" description="Invite teammates." />
        <Alert variant="warning" title="No organization context">
          Sign in with an organization to manage invitations.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Invitations"
        description="Invite teammates with secure single-use tokens."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite teammate
          </Button>
        }
      />

      {invitationsQuery.data && invitationsQuery.data.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No invitations yet"
          description="Send your first invitation — recipients get a secure single-use link."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite teammate
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={invitationsQuery.data}
          loading={invitationsQuery.isLoading}
          rowKey={(r) => r.id}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Invite teammate"
        description="They'll receive a link to accept and pick a password."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              form="invite-form"
              type="submit"
              loading={createMutation.isPending}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <form
          id="invite-form"
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
        >
          <Field>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="teammate@company.com"
              invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </Field>
          <Field>
            <Label htmlFor="role">Role</Label>
            <Select id="role" {...register("role")}>
              <option value="MEMBER">Member — baseline read access</option>
              <option value="ADMIN">Administrator — manage the org</option>
              <option value="OWNER">Owner — full control</option>
              <option value="GUEST">Guest — restricted access</option>
            </Select>
            <FieldHint>
              Determines the initial permissions when the invitation is
              accepted.
            </FieldHint>
            <FieldError message={errors.role?.message} />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
