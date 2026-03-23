"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Send, Trash2, UserPlus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
} as const;

export default function TeamSettingsPage() {
  const utils = api.useUtils();
  const { data: members = [], isLoading: membersLoading } =
    api.team.listMembers.useQuery();
  const { data: invitations = [], isLoading: invitationsLoading } =
    api.team.listInvitations.useQuery();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  const inviteMutation = api.team.invite.useMutation({
    onSuccess: async () => {
      await utils.team.listInvitations.invalidate();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    },
  });

  const removeMutation = api.team.removeMember.useMutation({
    onSuccess: () => utils.team.listMembers.invalidate(),
  });

  const updateRoleMutation = api.team.updateRole.useMutation({
    onSuccess: () => utils.team.listMembers.invalidate(),
  });

  const cancelInviteMutation = api.team.cancelInvitation.useMutation({
    onSuccess: () => utils.team.listInvitations.invalidate(),
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    await inviteMutation.mutateAsync({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage team members and invitations for your organization.
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 size-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>
                  Send an email invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Email address</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="colleague@example.com"
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Role</span>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "member" | "admin")
                    }
                    className="border-input bg-background w-full rounded-md border px-3 py-2"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                {inviteMutation.error && (
                  <p className="text-destructive text-sm">
                    {inviteMutation.error.message}
                  </p>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  <Send className="mr-2 size-4" />
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People who have access to this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading members...
              </p>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members found.</p>
            ) : (
              <div className="divide-border divide-y">
                {members.map((m) => (
                  <div
                    key={m.memberId}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex size-9 items-center justify-center rounded-full text-sm font-medium">
                        {m.userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.userName}</p>
                        <p className="text-muted-foreground text-xs">
                          {m.userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ROLE_COLORS[m.role] as
                            | "default"
                            | "secondary"
                            | "outline"
                        }
                      >
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                      {m.role !== "owner" && (
                        <div className="flex gap-1">
                          <select
                            value={m.role}
                            onChange={(e) =>
                              updateRoleMutation.mutate({
                                memberId: m.memberId,
                                role: e.target.value as "member" | "admin",
                              })
                            }
                            className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              removeMutation.mutate({ memberId: m.memberId })
                            }
                            disabled={removeMutation.isPending}
                            title="Remove member"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have been sent but not yet accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-border divide-y">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-muted-foreground text-xs">
                        Invited by {inv.inviterName} &middot;{" "}
                        {format(new Date(inv.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {ROLE_LABELS[inv.role ?? "member"] ?? inv.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          cancelInviteMutation.mutate({ invitationId: inv.id })
                        }
                        disabled={cancelInviteMutation.isPending}
                        title="Cancel invitation"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
