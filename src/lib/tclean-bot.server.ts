import { summarize } from "./configurator";
import type { Configuration } from "./configurator";

type Order = { kind: string; customer_name: string; details: { service: string; quantity: number; size: string; condition: string; message: string; configurator?: Configuration | undefined } };

const fallback = (o: Order) => `Bonjour ${o.customer_name}, ici TClean, votre assistant nettoyage 🧽 !
Pour une intervention rapide et efficace :
1. Dégagez l'accès au mobilier (environ 1 m autour) et retirez plaids, coussins décoratifs et objets.
2. Passez un coup d'aspirateur si possible, surtout en cas de poils d'animaux.
3. Prévoyez une prise électrique à proximité et un point d'eau accessible.
4. Ne frottez pas les taches et n'appliquez aucun produit avant notre passage.
5. Aérez la pièce après l'intervention : le séchage prend entre 12 et 24 h, évitez de vous asseoir avant que ce soit sec.
Une question ? Écrivez-nous ici ou appelez le 06 77 69 50 79.`;

/** Generates personalised preparation and care instructions for an order. Never throws. */
export async function botInstructions(o: Order): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return fallback(o);
  const cfg = o.details.configurator;
  const summary = cfg ? summarize(cfg) : `${o.details.service} × ${o.details.quantity}${o.details.size ? `, ${o.details.size}` : ""}`;
  const prompt = `Commande ${o.kind === "booking" ? "de réservation" : "de devis"} pour ${o.customer_name}.
Mobilier et options : ${summary}.
État décrit : ${o.details.condition || "non précisé"}. Message du client : ${o.details.message || "aucun"}.
Rédige le message.`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `Tu es « TClean », le bot expert en nettoyage de canapés, fauteuils, matelas et chaises de l'entreprise TClean (Strasbourg, 06 77 69 50 79). Ton ton est chaleureux, un brin drôle, en français, tutoiement interdit (vouvoiement). Écris un message court (max 180 mots), texte simple sans markdown ni astérisques, avec des listes numérotées. Contenu : 1) une phrase d'accueil sympa ; 2) des conseils de préparation du terrain pour une intervention plus rapide (accès, objets à retirer, aspirateur, animaux à éloigner, prise électrique, point d'eau, stationnement) ; 3) des conseils PROPRES au tissu et à la couleur indiqués (ex : velours = ne pas brosser à contre-poil, lin/coton clair = ne pas frotter les taches, cuir/microfibre, couleurs claires sensibles aux auréoles, couleurs foncées et poils) et aux options (taches, odeurs, poils d'animaux, coussins amovibles) ; 4) l'après-nettoyage : séchage entre 12 et 24 h, aérer, ne pas s'asseoir avant séchage. N'invente aucun prix, aucune date ni promesse.`,
        input: prompt,
      }),
    });
    if (!res.ok || !res.body) return fallback(o);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5));
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* ignore partial */ }
      }
    }
    out = out.replace(/\*\*/g, "").trim();
    return out ? out.slice(0, 2000) : fallback(o);
  } catch {
    return fallback(o);
  }
}

type ChatQuestion = { question: string; customerName: string; context: string };

const botChatFallback = (question: string, customerName: string) => {
  const q = question.toLocaleLowerCase("fr-FR");
  const greeting = `Bonjour ${customerName}, ici TClean 🧽. `;
  if (/séch|sec|combien de temps/.test(q)) return greeting + "Après un nettoyage, comptez généralement 12 à 24 heures de séchage selon le tissu, l’aération et les conditions de la pièce. Aérez bien et attendez que le mobilier soit complètement sec avant de vous asseoir.";
  if (/tache|produit|frotter|odeur|poil/.test(q)) return greeting + "Évitez de frotter la tache ou d’appliquer un produit sans connaître le tissu : cela peut fixer la salissure ou créer une auréole. Indiquez-nous le type de tissu et la nature de la tache, ou joignez une photo pour que l’équipe puisse vous orienter.";
  if (/prépar|avant|intervention|rendez-vous/.test(q)) return greeting + "Avant notre passage, dégagez l’accès au mobilier, retirez les objets et plaids, passez l’aspirateur si possible, éloignez les animaux et prévoyez une prise électrique ainsi qu’un point d’eau accessibles.";
  if (/prix|tarif|coût|combien|disponib|date|horaire|réservation/.test(q)) return greeting + "Je préfère ne pas inventer de prix ni de disponibilité. Envoyez votre demande dans cette conversation : l’équipe TClean pourra vérifier les informations exactes.";
  return greeting + "Je peux vous aider sur la préparation du canapé, les taches, les précautions selon le tissu et le temps de séchage. Pour un tarif ou une disponibilité précise, l’équipe TClean devra confirmer. Vous pouvez aussi joindre une photo.";
};

/** Answers client questions without inventing prices, appointment slots or guarantees. */
export async function botChatReply(input: ChatQuestion): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return botChatFallback(input.question, input.customerName);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `Vous êtes TClean, l’assistant virtuel officiel d’une entreprise de nettoyage de canapés et textiles à domicile à Strasbourg. Répondez en français, avec vouvoiement, de manière chaleureuse et concise (80 à 130 mots maximum). Aidez sur préparation, types de tissus, taches, odeurs, poils d’animaux et séchage. N’inventez jamais de prix, promotions, créneaux, confirmations, délais de rendez-vous ni garanties. Si une question nécessite les données réelles du planning ou une décision commerciale, expliquez que l’équipe TClean doit confirmer. Distinguez clairement le bot de l’équipe humaine. Ne demandez pas de données sensibles. Nom client : ${input.customerName}. Contexte de la conversation : ${input.context}`,
        input: input.question,
      }),
    });
    if (!res.ok || !res.body) return botChatFallback(input.question, input.customerName);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", output = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event = JSON.parse(line.slice(5));
          if (event.type === "response.output_text.delta") output += event.delta;
        } catch { /* Ignore partial streaming events. */ }
      }
    }
    return output.replace(/\*\*/g, "").trim().slice(0, 1500) || botChatFallback(input.question, input.customerName);
  } catch {
    return botChatFallback(input.question, input.customerName);
  }
}
