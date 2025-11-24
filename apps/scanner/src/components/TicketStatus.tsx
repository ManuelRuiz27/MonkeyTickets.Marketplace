import React from 'react';
import type { TicketValidationResult } from '../services/api';

interface TicketStatusProps {
    ticket: TicketValidationResult | null;
    onCheckIn?: () => void;
    checking?: boolean;
    className?: string;
}

const TicketStatus: React.FC<TicketStatusProps> = ({ ticket, onCheckIn, checking, className }) => {
    if (!ticket) return null;

    const isValid = ticket.status === 'VALID' && ticket.orderStatus === 'PAID';
    const isUsed = ticket.status === 'USED';
    const isCancelled = ticket.status === 'CANCELLED';
    const isPending = ticket.orderStatus === 'PENDING';
    const classes = ['ticket-status', isValid ? 'valid' : isUsed ? 'used' : 'invalid'];

    if (className) {
        classes.push(className);
    }

    return (
        <div className={classes.join(' ')}>
            <div className="status-icon">
                {isValid ? '✓' : '✗'}
            </div>

            <div className="status-content">
                <h2 className="status-title">
                    {isValid ? 'Valid Ticket' : isUsed ? 'Already Used' : 'Invalid Ticket'}
                </h2>

                <div className="ticket-details">
                    <div className="detail-row">
                        <span className="label">Name:</span>
                        <span className="value">{ticket.buyer.name}</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Event:</span>
                        <span className="value">{ticket.event.title}</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Ticket Type:</span>
                        <span className="value">{ticket.template.name}</span>
                    </div>
                    {ticket.event.venue && (
                        <div className="detail-row">
                            <span className="label">Venue:</span>
                            <span className="value">{ticket.event.venue}</span>
                        </div>
                    )}
                    {isUsed && ticket.usedAt && (
                        <div className="detail-row used-at">
                            <span className="label">Used at:</span>
                            <span className="value">
                                {new Date(ticket.usedAt).toLocaleString()}
                            </span>
                        </div>
                    )}
                    {isCancelled && (
                        <div className="detail-row error">
                            <span className="value">This ticket has been cancelled</span>
                        </div>
                    )}
                    {isPending && (
                        <div className="detail-row error">
                            <span className="value">Payment is pending</span>
                        </div>
                    )}
                </div>

                {isValid && onCheckIn && (
                    <button
                        className="check-in-button"
                        onClick={onCheckIn}
                        disabled={checking}
                    >
                        {checking ? 'Checking in...' : 'Check In'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default TicketStatus;
