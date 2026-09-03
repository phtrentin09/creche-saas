"use client";

export function FormularioComConfirmacao({
  action,
  mensagem,
  children,
}: {
  action: (formData: FormData) => void;
  mensagem: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(evento) => {
        if (!confirm(mensagem)) {
          evento.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
