"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { AccountForm } from "./account-form";

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAccountModal({
  open,
  onClose,
  onSuccess,
}: AddAccountModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add social account"
      description="Connect a new account to this workspace."
      size="md"
    >
      <AccountForm
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
