export type DecisionChannel = {
  name: "Email" | "Ads";
  revenue: number;
  spend: number;
};

export function chooseChannel(channels: readonly DecisionChannel[]): "Email" | "Ads" | "hold" {
  const ranked = channels
    .filter(channel => channel.spend > 0)
    .map(channel => ({
      name: channel.name,
      ratio: (channel.revenue - channel.spend) / channel.spend,
    }))
    .sort((a, b) => b.ratio - a.ratio);
  if (!ranked.length || ranked[0].ratio <= 0) return "hold";
  if (ranked.length > 1 && Math.abs(ranked[0].ratio - ranked[1].ratio) < 1e-9) return "hold";
  return ranked[0].name;
}
