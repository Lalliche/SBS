"use client";
import { Modal } from "@/components/ui/Overlay";
import { clientLinkValidity } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { Callout } from "@/components/ui/Surface";

export function ClientPreview({ open, onClose, token }: { open: boolean; onClose: () => void; token?: string }) {
  const { s } = useSession();
  const links = s.clientLinks;
  const chosen = (token && links.find((l) => l.token === token)) || links.find((l) => clientLinkValidity(l, s.clientResponses, s.now) === "OK") || links[0];
  return (
    <Modal open={open} onClose={onClose} title="Aperçu côté client" subtitle="Ce que voit un client qui ouvre le lien, sur téléphone." size="md">
      {!chosen ? (
        <Callout tone="info" title="Aucun lien client pour l’instant">
          Créez un lien depuis « Feedback client » (Admin RH) ou passez au scénario « Cycle en cours ».
        </Callout>
      ) : (
        <div className="flex justify-center">
          <div className="h-[34em] w-[19em] overflow-hidden rounded-[2.2em] border-[0.5em] border-ink bg-bg shadow-xl">
            <iframe title="Page publique client" src={`/c/${chosen.token}`} className="size-full border-0" />
          </div>
        </div>
      )}
    </Modal>
  );
}
