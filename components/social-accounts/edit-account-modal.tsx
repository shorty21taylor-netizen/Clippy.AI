"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { AccountForm } from "./account-form";
import type { SocialAccount } from "./accounts-table";

interface EditAccountModalProps {
  account: SocialAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAccountModal({
  account,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  if (!account) return null;

  return (
    <Modal
      open={Boolean(account)}
      onClose={onClose}
      title="Edit account"
      description={`@${account.username} · ${account.platform}`}
      size="md"
    >
      <AccountForm
        accountId={account.id}
        initialData={{
          platform: account.platform,
          username: account.username,
          displayName: account.displayName ?? "",
          status: account.status,
          tags: account.tags,
          proxyConfig: account.proxyConfig ?? "",
          accessToken: "",
          refreshToken: "",
        }}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
