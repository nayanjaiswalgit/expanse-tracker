import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FormProvider, useFormContext } from "../../contexts/FormContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  preventCloseOnUnsavedChanges?: boolean;
}

const ModalContent = ({
  isOpen,
  onClose,
  title,
  children,
  size = "lg",
  closeOnBackdrop = true,
  preventCloseOnUnsavedChanges = true,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isDirty, resetFormState } = useFormContext();

  const hasUnsavedChanges = preventCloseOnUnsavedChanges && isDirty;

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetFormState();
    }
  }, [isOpen, resetFormState]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        if (preventCloseOnUnsavedChanges && hasUnsavedChanges) {
          // Show confirmation dialog or prevent close
          const shouldClose = window.confirm(
            "You have unsaved changes. Are you sure you want to close without saving?"
          );
          if (shouldClose) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden"; // Prevent body scroll
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, preventCloseOnUnsavedChanges, hasUnsavedChanges]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicked directly on the backdrop, not on child elements
    if (closeOnBackdrop && e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();

      if (preventCloseOnUnsavedChanges && hasUnsavedChanges) {
        // Show confirmation dialog before closing
        const shouldClose = window.confirm(
          "You have unsaved changes. Are you sure you want to close without saving?"
        );
        if (shouldClose) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (preventCloseOnUnsavedChanges && hasUnsavedChanges) {
      // Show confirmation dialog before closing
      const shouldClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close without saving?"
      );
      if (shouldClose) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out scale-100 border border-secondary-200 dark:border-secondary-700`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={handleCloseButtonClick}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div 
          className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const Modal = (props: ModalProps) => {
  return (
    <FormProvider>
      <ModalContent {...props} />
    </FormProvider>
  );
};

export default Modal;
