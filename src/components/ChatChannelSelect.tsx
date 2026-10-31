import { CHAT_CHANNEL_NAMES, type ChatChannel } from '../game/chatChannels';

export interface ChatChannelProps {
  channels: ChatChannel[];
  channel: ChatChannel;
  onChannelChange: (channel: ChatChannel) => void;
}

export function ChatChannelSelect({ channels, channel, onChannelChange }: ChatChannelProps) {
  return <select aria-label="Kênh trò chuyện" value={channel} disabled={!channels.length} onChange={e => onChannelChange(e.target.value as ChatChannel)} className="min-w-0 max-w-20 h-9 rounded-lg border border-amber-300/30 bg-[#211a2e] px-1 text-base text-amber-200">
    {channels.length ? channels.map(c => <option key={c} value={c}>{CHAT_CHANNEL_NAMES[c]}</option>) : <option value="global">Chờ</option>}
  </select>;
}
