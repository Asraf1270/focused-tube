import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="text-center">
        {/* Icon */}
        <div className={`
          w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4
          ${variant === 'danger' ? 'bg-error/10' : 'bg-accent-blue/10'}
        `}>
          <svg className={`w-7 h-7 ${variant === 'danger' ? 'text-error' : 'text-accent-blue'}`} 
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-heading-sm font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-body-sm text-text-secondary mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="secondary" className="flex-1">
            {cancelLabel}
          </Button>
          <Button 
            onClick={onConfirm} 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            loading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}