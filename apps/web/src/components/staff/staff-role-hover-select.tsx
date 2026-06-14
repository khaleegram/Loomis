'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChangeStaffRole, useStaffDirectory } from '@loomis/api-client';
import {
  changeStaffRoleRequest,
  staffPrimaryRole,
  type StaffPrimaryRole,
  type StaffProfileStatus,
  type StaffRole,
} from '@loomis/contracts';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { useCan } from '@/lib/auth/use-capability';
import { formatStaffDisplayRole, isSingletonPrimaryRole } from '@/lib/staff/staff-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRIMARY_ROLES = staffPrimaryRole.options;
const CLOSE_DELAY_MS = 200;
const MENU_GAP_PX = 6;
const VIEWPORT_PADDING = 8;

type MenuPlacement = 'top' | 'bottom';
type MenuStep = 'roles' | 'replacement' | 'vacant-warning';

interface MenuPosition {
  top: number;
  left: number;
  placement: MenuPlacement;
}

interface StaffRoleHoverSelectProps {
  staffProfileId: string;
  primaryRole: StaffPrimaryRole | null;
  roleExtensions?: readonly StaffRole[];
  status: StaffProfileStatus;
  size?: 'sm' | 'md';
  onSuccess?: () => void;
  className?: string;
}

function computeMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement | null,
  step: MenuStep,
): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const menuHeight =
    menu?.offsetHeight ??
    (step === 'vacant-warning' ? 200 : step === 'replacement' ? 280 : PRIMARY_ROLES.length * 36 + 12);
  const menuWidth =
    menu?.offsetWidth ?? (step === 'vacant-warning' ? 240 : step === 'replacement' ? 220 : 180);

  const spaceAbove = rect.top - VIEWPORT_PADDING;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;

  const placement: MenuPlacement =
    spaceAbove >= menuHeight + MENU_GAP_PX || spaceAbove >= spaceBelow ? 'top' : 'bottom';

  let top =
    placement === 'top'
      ? rect.top - menuHeight - MENU_GAP_PX
      : rect.bottom + MENU_GAP_PX;

  if (placement === 'top' && top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
  }
  if (placement === 'bottom' && top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = window.innerHeight - menuHeight - VIEWPORT_PADDING;
  }

  let left = rect.left + rect.width / 2 - menuWidth / 2;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING),
  );

  return { top, left, placement };
}

export function StaffRoleHoverSelect({
  staffProfileId,
  primaryRole,
  roleExtensions = [],
  status,
  size = 'md',
  onSuccess,
  className = '',
}: StaffRoleHoverSelectProps) {
  const tenantId = useTenantId();
  const canChangeRole = useCan('staff.role.assign');
  const changeRole = useChangeStaffRole(tenantId ?? '', staffProfileId);
  const { data: directoryData } = useStaffDirectory(tenantId ?? '');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverDepth = useRef(0);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<MenuStep>('roles');
  const [pendingRole, setPendingRole] = useState<StaffPrimaryRole | null>(null);
  const [vacantAcknowledged, setVacantAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    placement: 'top',
  });

  const editable = canChangeRole && status === 'active';
  const label = formatStaffDisplayRole(primaryRole, roleExtensions);
  const vacatedSingleton = isSingletonPrimaryRole(primaryRole);

  const replacementCandidates =
    directoryData?.staff.filter(
      (member) => member.id !== staffProfileId && member.status === 'active',
    ) ?? [];

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-0.5'
      : 'px-2.5 py-0.5 text-[11px] gap-1';

  useEffect(() => setMounted(true), []);

  const resetFlow = () => {
    setStep('roles');
    setPendingRole(null);
    setVacantAcknowledged(false);
    setError(null);
  };

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPosition(computeMenuPosition(triggerRef.current, menuRef.current, step));
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    requestAnimationFrame(updateMenuPosition);
  }, [open, step, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => updateMenuPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updateMenuPosition]);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      if (hoverDepth.current === 0) {
        setOpen(false);
        resetFlow();
      }
    }, CLOSE_DELAY_MS);
  };

  const handlePointerEnter = () => {
    if (!editable) return;
    hoverDepth.current += 1;
    clearCloseTimer();
    setOpen(true);
  };

  const handlePointerLeave = () => {
    if (!editable) return;
    hoverDepth.current = Math.max(0, hoverDepth.current - 1);
    scheduleClose();
  };

  const applyRoleChange = async (
    role: StaffPrimaryRole,
    options?: { replacementStaffProfileId?: string; singletonOverrideConfirmed?: boolean },
  ) => {
    setError(null);
    try {
      await changeRole.mutateAsync(changeStaffRoleRequest.parse({
        primaryRole: role,
        ...(options?.replacementStaffProfileId
          ? { replacementStaffProfileId: options.replacementStaffProfileId }
          : {}),
        ...(options?.singletonOverrideConfirmed ? { singletonOverrideConfirmed: true } : {}),
      }));
      setOpen(false);
      hoverDepth.current = 0;
      resetFlow();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role change failed.');
    }
  };

  const handleRolePick = (role: StaffPrimaryRole) => {
    if (!editable || role === primaryRole || changeRole.isPending) return;

    if (vacatedSingleton) {
      setPendingRole(role);
      setStep('replacement');
      setError(null);
      return;
    }

    void applyRoleChange(role);
  };

  const handleReplacementPick = (replacementStaffProfileId: string) => {
    if (!pendingRole) return;
    void applyRoleChange(pendingRole, { replacementStaffProfileId });
  };

  const handleVacantConfirm = () => {
    if (!pendingRole || !vacantAcknowledged) return;
    void applyRoleChange(pendingRole, { singletonOverrideConfirmed: true });
  };

  const menuWidthPx =
    step === 'vacant-warning' ? 240 : step === 'replacement' ? 220 : 180;

  const triggerClass = `inline-flex max-w-full items-center rounded-full border font-semibold transition-colors ${sizeClass} ${
    editable
      ? 'cursor-pointer border-brand-200/80 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100'
      : 'border-brand-100/60 bg-brand-50/80 text-brand-700'
  } ${className}`.trim();

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        className="fixed z-[10000] max-h-[min(320px,70vh)] overflow-y-auto rounded-xl border border-brand-100/80 bg-white p-1 shadow-xl"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuWidthPx,
        }}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
      >
        {step === 'roles' ? (
          <div role="listbox" aria-label="Primary roles">
            {PRIMARY_ROLES.map((role) => {
              const selected = role === primaryRole;
              return (
                <button
                  key={role}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={changeRole.isPending || selected}
                  className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors disabled:cursor-default ${
                    selected
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-neutral-700 hover:bg-brand-50/70'
                  }`}
                  onClick={() => handleRolePick(role)}
                >
                  <span className="flex-1">{formatRoleLabel(role)}</span>
                  {selected ? (
                    <Check aria-hidden className="size-3.5 shrink-0 text-brand-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : step === 'replacement' ? (
          <div role="listbox" aria-label="Role replacement">
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50"
              onClick={() => {
                setStep('roles');
                setPendingRole(null);
                setError(null);
              }}
            >
              <ArrowLeft aria-hidden className="size-3" />
              Back
            </button>
            <p className="px-2 pb-2 text-[10px] leading-snug text-neutral-500">
              Who becomes{' '}
              <span className="font-semibold text-brand-700">
                {primaryRole ? formatRoleLabel(primaryRole) : 'this role'}
              </span>
              ?
            </p>
            {replacementCandidates.map((member) => (
              <button
                key={member.id}
                type="button"
                role="option"
                disabled={changeRole.isPending}
                className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-50/70 disabled:opacity-50"
                onClick={() => handleReplacementPick(member.id)}
              >
                <span className="text-[12px] font-medium text-neutral-800">{member.fullName}</span>
                <span className="text-[10px] text-neutral-400">
                  {member.primaryRole ? formatRoleLabel(member.primaryRole) : 'No role'}
                </span>
              </button>
            ))}
            <div className="my-1 border-t border-neutral-100" />
            <button
              type="button"
              className={`flex w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-medium ${SEMANTIC.warning.text} hover:bg-gold-50`}
              onClick={() => {
                setStep('vacant-warning');
                setVacantAcknowledged(false);
                setError(null);
              }}
            >
              Leave vacant for now…
            </button>
          </div>
        ) : (
          <div className="px-2 py-1">
            <button
              type="button"
              className="mb-2 flex w-full items-center gap-1 rounded-lg px-1 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50"
              onClick={() => {
                setStep('replacement');
                setVacantAcknowledged(false);
                setError(null);
              }}
            >
              <ArrowLeft aria-hidden className="size-3" />
              Back
            </button>
            <p className={`rounded-lg px-2.5 py-2 text-[11px] leading-snug ${SEMANTIC.warning.pill} ${SEMANTIC.warning.textStrong}`}>
              <span className="font-semibold">
                {primaryRole ? formatRoleLabel(primaryRole) : 'This role'}
              </span>{' '}
              will have no active holder. Finance or exam workflows may be blocked until you assign
              someone.
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={vacantAcknowledged}
                onChange={(e) => setVacantAcknowledged(e.target.checked)}
                className="mt-0.5 size-3.5 rounded border-neutral-300"
              />
              <span className="text-[11px] leading-snug text-neutral-600">
                I understand and will assign coverage soon
              </span>
            </label>
            <button
              type="button"
              disabled={!vacantAcknowledged || changeRole.isPending}
              className={`mt-2 w-full rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${SEMANTIC.warning.button}`}
              onClick={handleVacantConfirm}
            >
              {changeRole.isPending ? 'Saving…' : 'Confirm without replacement'}
            </button>
          </div>
        )}
      </div>
    ) : null;

  if (!editable) {
    return (
      <span className={triggerClass} title={label}>
        <span className="truncate">{label}</span>
      </span>
    );
  }

  const ChevronIcon = menuPosition.placement === 'top' ? ChevronUp : ChevronDown;

  return (
    <>
      <div
        className="relative inline-flex max-w-full flex-col items-center"
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={triggerRef}
          type="button"
          className={triggerClass}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Change role — currently ${label}`}
          onClick={() => {
            setOpen((prev) => {
              if (prev) resetFlow();
              return !prev;
            });
          }}
        >
          <span className="truncate">{label}</span>
          {changeRole.isPending ? (
            <Loader2 aria-hidden className="size-3 shrink-0 animate-spin" />
          ) : (
            <ChevronIcon
              aria-hidden
              className={`size-3 shrink-0 text-brand-500 transition-transform ${open ? 'opacity-100' : 'opacity-70'}`}
            />
          )}
        </button>
        {error ? <span className={`mt-1 max-w-[140px] text-center text-[10px] ${SEMANTIC.danger.error}`}>{error}</span> : null}
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
