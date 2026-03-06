import React from 'react';
import { Users, Crown, Circle, UserMinus } from 'lucide-react';
import Avatar from './ui/Avatar';

export default function MembersList({ users, streamerId, currentUserId, onKick }) {
    const sortedUsers = [...users].sort((a, b) => {
        // Streamer first, then alphabetically
        if (a.id === streamerId) return -1;
        if (b.id === streamerId) return 1;
        return a.username.localeCompare(b.username);
    });

    const amIHost = currentUserId === streamerId;

    return (
        <div className="flex flex-col h-full bg-bg-modal">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Users size={13} className="text-red-brand" aria-hidden="true" />
                    <h2 className="text-white text-xs sm:text-sm font-semibold">Members</h2>
                </div>
                <span className="text-[10px] sm:text-xs text-text-dim font-bold tracking-widest uppercase">
                    {users.length} Joined
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {sortedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-40">
                        <Users size={32} className="text-text-dim" />
                        <p className="text-sm text-text-muted">No one else is here yet</p>
                    </div>
                ) : (
                    sortedUsers.map((user) => {
                        const isStreamer = user.id === streamerId || user.isStreamer;
                        const isMe = user.id === currentUserId;

                        return (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-bg-surface/40 hover:bg-bg-surface transition-colors group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative flex-shrink-0">
                                        <Avatar name={user.username} size="sm" />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-bg-modal shadow-sm" title="Online" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm text-white font-medium flex items-center gap-1.5 truncate">
                                            {user.username}
                                            {isMe && <span className="text-[10px] text-text-dim font-normal">(You)</span>}
                                            {isStreamer && <Crown size={12} className="text-yellow-500 fill-yellow-500/20" title="Host" />}
                                        </span>
                                        <span className="text-[10px] text-green-500 font-semibold uppercase tracking-tighter">Online</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {isStreamer ? (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-bold uppercase tracking-widest">
                                            Host
                                        </span>
                                    ) : (
                                        amIHost && (
                                            <button
                                                onClick={() => onKick(user.id, user.username)}
                                                className="p-1.5 sm:p-2 rounded-lg bg-red-brand/10 text-red-brand/60 hover:text-red-brand hover:bg-red-brand/20 
                                                           border border-transparent hover:border-red-brand/30 transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove from room"
                                            >
                                                <UserMinus size={14} />
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-border bg-bg-base/30">
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted uppercase tracking-widest font-bold">
                    <Circle size={8} className="fill-green-500 text-green-500" />
                    Status: Sycned with Room
                </div>
            </div>
        </div>
    );
}
