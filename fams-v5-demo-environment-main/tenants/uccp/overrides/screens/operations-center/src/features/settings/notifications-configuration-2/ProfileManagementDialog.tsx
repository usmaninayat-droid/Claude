import { useState, useMemo } from 'react'
import { Plus, Trash2, X, Users, MoreVertical, FileText, AlertTriangle, Search, User } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Button, Input, FloatingLabelInput, Checkbox, Badge, cn, Tooltip, TooltipTrigger, TooltipContent,
} from '@fams/design-system'
import { ROLES } from './notificationsConfigData2'
import type { NotificationProfile, Role } from './notificationsConfigData2'
import { CustomScrollbar } from '../../../components/CustomScrollbar'

interface ProfileManagementSheetProps {
  open: boolean
  onClose: () => void
  profiles: NotificationProfile[]
  onSaveProfiles: (updatedProfiles: NotificationProfile[]) => void
}

export function ProfileManagementSheet({
  open,
  onClose,
  profiles,
  onSaveProfiles,
}: ProfileManagementSheetProps) {
  const [localProfiles, setLocalProfiles] = useState<NotificationProfile[]>(() => [...profiles])

  // Secondary side sheet state (for Create & Edit Profile)
  const [editingProfile, setEditingProfile] = useState<NotificationProfile | null>(null)
  const [isNewProfile, setIsNewProfile] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')

  // Delete confirmation popup state
  const [deletingProfile, setDeletingProfile] = useState<NotificationProfile | null>(null)

  // Handlers for Secondary Side Sheet (Create / Edit)
  const handleOpenCreate = () => {
    setEditingProfile({
      id: `prof-custom-${Date.now()}`,
      name: '',
      roles: [],
    })
    setIsNewProfile(true)
    setRoleSearch('')
  }

  const handleOpenEdit = (profile: NotificationProfile) => {
    setEditingProfile({
      ...profile,
      roles: [...profile.roles],
    })
    setIsNewProfile(false)
    setRoleSearch('')
  }

  const handleToggleRoleInEditor = (role: Role, checked: boolean, isReadOnly: boolean) => {
    if (!editingProfile || isReadOnly) return
    const nextRoles = checked
      ? [...new Set([...editingProfile.roles, role])]
      : editingProfile.roles.filter((r) => r !== role)
    setEditingProfile({ ...editingProfile, roles: nextRoles })
  }

  const handleSaveEditProfile = () => {
    if (!editingProfile) return
    const finalName =
      editingProfile.name.trim() ||
      (isNewProfile ? `New Profile ${localProfiles.length + 1}` : 'Untitled Profile')

    const finalProfile: NotificationProfile = {
      ...editingProfile,
      name: finalName,
    }

    const updated = localProfiles.some((p) => p.id === finalProfile.id)
      ? localProfiles.map((p) => (p.id === finalProfile.id ? finalProfile : p))
      : [...localProfiles, finalProfile]

    setLocalProfiles(updated)
    onSaveProfiles(updated)
    setEditingProfile(null)
  }

  // Delete confirmation handler
  const handleConfirmDelete = () => {
    if (!deletingProfile) return
    const updated = localProfiles.filter((p) => p.id !== deletingProfile.id)
    setLocalProfiles(updated)
    onSaveProfiles(updated)
    setDeletingProfile(null)
  }

  // Search filtered roles inside the editor
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return ROLES
    const q = roleSearch.trim().toLowerCase()
    return ROLES.filter((r) => r.toLowerCase().includes(q))
  }, [roleSearch])

  // Sorting roles for Creation vs Edit modes:
  // - Creation: Available roles at top, Read-only roles at bottom
  // - Edit: Selected roles at top, Available roles in middle, Read-only roles at bottom
  const sortedFilteredRoles = useMemo(() => {
    if (!editingProfile) return []

    const list = [...filteredRoles]

    return list.sort((a, b) => {
      const aSelected = editingProfile.roles.includes(a)
      const bSelected = editingProfile.roles.includes(b)

      const aOwner = localProfiles.find((p) => p.id !== editingProfile.id && p.roles.includes(a))
      const bOwner = localProfiles.find((p) => p.id !== editingProfile.id && p.roles.includes(b))

      const aReadOnly = !!aOwner && !aSelected
      const bReadOnly = !!bOwner && !bSelected

      const aAvailable = !aSelected && !aReadOnly
      const bAvailable = !bSelected && !bReadOnly

      if (isNewProfile) {
        // Creation: Available roles at top (1), Read-only roles at bottom (2)
        const aRank = aAvailable ? 1 : 2
        const bRank = bAvailable ? 1 : 2
        if (aRank !== bRank) return aRank - bRank
      } else {
        // Edit: Selected roles at top (1), Available roles in middle (2), Read-only roles at bottom (3)
        const aRank = aSelected ? 1 : aAvailable ? 2 : 3
        const bRank = bSelected ? 1 : bAvailable ? 2 : 3
        if (aRank !== bRank) return aRank - bRank
      }

      return a.localeCompare(b)
    })
  }, [filteredRoles, editingProfile, localProfiles, isNewProfile])

  return (
    <>
      {/* Primary Side Sheet: Manage Notification Profiles */}
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent side="right" width="580px" hideClose className="p-0 flex flex-col h-full bg-card shadow-none">
          {/* Floating circular close button matching Dashboard sheets */}
          <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>

          {/* Header with Title and + New Profile Button */}
          <SheetHeader className="px-6 py-5 border-b border-border shrink-0 flex flex-row items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-foreground">
              Manage Notification Profiles
            </SheetTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenCreate}
              className="font-semibold gap-1.5 h-8 px-3 cursor-pointer shrink-0"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              New Profile
            </Button>
          </SheetHeader>

          {/* Body: Profile Cards List */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
            {localProfiles.length > 0 ? (
              localProfiles.map((profile) => {
                const VISIBLE_ROLE_LIMIT = 2
                const roles = profile.roles
                const visibleRoles = roles.slice(0, VISIBLE_ROLE_LIMIT)
                const overflowRoles = roles.slice(VISIBLE_ROLE_LIMIT)

                return (
                  <div
                    key={profile.id}
                    className="group relative flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card transition-colors"
                  >
                    {/* Left: Icon Box + Profile Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground">
                        <FileText className="size-5" strokeWidth={1.75} />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {profile.name}
                        </span>
                        {/* Single line role chips with overflow pill (+1, +2...) */}
                        <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                          {roles.length > 0 ? (
                            <>
                              {visibleRoles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  size="xs"
                                  className="text-[11px] font-normal text-muted-foreground bg-transparent border-border px-2.5 py-0.5 rounded-full shrink-0 max-w-[150px] truncate"
                                >
                                  {role}
                                </Badge>
                              ))}
                              {overflowRoles.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      size="xs"
                                      className="text-[11px] font-semibold text-muted-foreground bg-transparent hover:bg-muted/40 border-border px-2 py-0.5 rounded-full shrink-0 cursor-help transition-colors"
                                    >
                                      +{overflowRoles.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs w-max max-w-xs p-2.5 flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                      Additional Roles ({overflowRoles.length})
                                    </span>
                                    <div className="flex flex-col gap-1 items-start">
                                      {overflowRoles.map((r) => (
                                        <span key={r} className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-foreground font-medium border border-border whitespace-nowrap">
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">
                              No roles assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: 3-Dots Action Dropdown Menu (hidden until row hover / menu open) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all outline-none cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                          aria-label={`Actions for ${profile.name}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(profile)}
                          className="cursor-pointer text-xs font-medium"
                        >
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          destructive
                          onClick={() => setDeletingProfile(profile)}
                          className="cursor-pointer text-xs font-medium text-destructive focus:text-destructive"
                        >
                          Delete Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs gap-2">
                <Users className="size-8 text-muted-foreground/40" />
                <span>No notification profiles found.</span>
                <span>Click "+ New Profile" to create one.</span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Secondary Side Sheet: Stacked over main sheet for Create / Edit Profile */}
      <Sheet open={!!editingProfile} onOpenChange={(o) => { if (!o) setEditingProfile(null) }}>
        <SheetContent side="right" width="520px" hideClose className="p-0 flex flex-col h-full bg-card z-50 shadow-none">
          {/* Floating close button for secondary sheet */}
          <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
            <SheetTitle className="text-base font-semibold text-foreground">
              {isNewProfile ? 'Create Notification Profile' : 'Edit Notification Profile'}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Set profile details and assign target roles. Roles are restricted to max 1 profile.
            </SheetDescription>
          </SheetHeader>

          {/* Form Content */}
          {editingProfile && (
            <CustomScrollbar className="min-h-0 flex-1" viewportClassName="p-6 flex flex-col gap-5">
              {/* Profile Name Field using Design System FloatingLabelInput */}
              <FloatingLabelInput
                label="Profile Name"
                leadingIcon={<User className="size-4" />}
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                placeholder="e.g. Operations & Planning"
              />

              {/* Roles Section Header & Search */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Assigned Roles ({editingProfile.roles.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Max 1 profile per role
                  </span>
                </div>

                {/* Role Search Bar using Design System FloatingLabelInput */}
                <FloatingLabelInput
                  label="Search Roles"
                  leadingIcon={<Search className="size-4" />}
                  placeholder="Type to filter roles…"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />

                {/* Roles Checklist */}
                <div className="flex flex-col gap-2 border border-border/80 rounded-xl p-3 bg-card mt-1">
                  {sortedFilteredRoles.length > 0 ? (
                    sortedFilteredRoles.map((role) => {
                      const isChecked = editingProfile.roles.includes(role)
                      const ownerProfile = localProfiles.find(
                        (p) => p.id !== editingProfile.id && p.roles.includes(role)
                      )
                      const isReadOnlyOther = !!ownerProfile && !isChecked

                      return (
                        <div
                          key={role}
                          onClick={() => handleToggleRoleInEditor(role, !isChecked, isReadOnlyOther)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-[4px] border transition-all select-none text-xs font-medium',
                            isChecked
                              ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground font-semibold'
                              : isReadOnlyOther
                              ? 'border-border/60 bg-muted/15 opacity-60 cursor-not-allowed text-muted-foreground'
                              : 'border-border bg-card hover:border-primary/40 text-foreground cursor-pointer'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isChecked}
                              disabled={isReadOnlyOther}
                              onCheckedChange={(c) => handleToggleRoleInEditor(role, c === true, isReadOnlyOther)}
                            />
                            <span className={cn('text-xs', isChecked && 'font-semibold text-foreground')}>
                              {role}
                            </span>
                          </div>

                          {isReadOnlyOther && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1">
                                  <Badge variant="muted" size="xs" className="text-[10px] font-normal text-muted-foreground border-border bg-muted/50">
                                    Currently in {ownerProfile.name}
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[240px]">
                                This role is assigned to {ownerProfile.name}. Unassign it from {ownerProfile.name} first before assigning it here.
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {isChecked && (
                            <Badge variant="info" size="xs" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                              Assigned
                            </Badge>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No roles found matching "{roleSearch}"
                    </div>
                  )}
                </div>
              </div>
            </CustomScrollbar>
          )}

          {/* Secondary Sheet Footer */}
          <SheetFooter className="px-6 py-4 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between w-full">
            <SheetClose asChild>
              <Button variant="tertiary" size="sm" className="h-8 text-xs cursor-pointer">
                Cancel
              </Button>
            </SheetClose>
            <Button variant="primary" size="sm" onClick={handleSaveEditProfile} className="h-8 text-xs cursor-pointer">
              {isNewProfile ? 'Create Profile' : 'Save Profile'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Popup Dialog */}
      <Dialog open={!!deletingProfile} onOpenChange={(o) => { if (!o) setDeletingProfile(null) }}>
        <DialogContent className="max-w-[420px] p-6 bg-card border border-border rounded-xl">
          <DialogHeader className="p-0 gap-2">
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Delete Profile?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-normal">
              Are you sure you want to delete <strong className="text-foreground">{deletingProfile?.name}</strong>? Roles assigned to this profile will become unassigned.
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Footer with Cancel and Delete buttons at opposite corners */}
          <DialogFooter className="pt-5 border-0 flex items-center justify-between w-full p-0">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setDeletingProfile(null)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="h-8 text-xs cursor-pointer"
            >
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export ProfileManagementDialog alias for backwards compatibility
export const ProfileManagementDialog = ProfileManagementSheet
