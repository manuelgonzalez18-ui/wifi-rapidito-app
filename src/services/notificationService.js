export const notificationService = {
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio.');
            return false;
        }

        if (Notification.permission === 'granted') return true;

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    sendNotification: (title, body, tag = 'default') => {
        if (Notification.permission === 'granted') {
            // Prevent duplicate notifications with the same tag
            const lastNotified = localStorage.getItem(`notify_${tag}`);
            const now = Date.now();

            // Throttle: Don't show same notification tag within 1 hour
            if (lastNotified && (now - parseInt(lastNotified)) < 3600000) {
                return;
            }

            new Notification(title, {
                body,
                icon: '/favicon.ico', // Fallback to favicon
                badge: '/favicon.ico',
                tag: tag
            });

            localStorage.setItem(`notify_${tag}`, now.toString());
        }
    },

    checkEvents: (user, invoices, tickets, promiseDate) => {
        if (!user) return;

        // 1. Service Suspension / Reactivation Alert
        const status = user.estado?.toLowerCase() || '';
        const lastStatus = localStorage.getItem('last_user_status');

        if (status === 'suspendido' || status === 'cortado') {
            notificationService.sendNotification(
                '⚠️ Servicio Suspendido',
                'Tu servicio ha sido suspendido por falta de pago. Por favor contacta a soporte.',
                'status_suspended'
            );
        } else if ((status === 'activo' || status === 'online') && (lastStatus === 'suspendido' || lastStatus === 'cortado')) {
            notificationService.sendNotification(
                '✅ Servicio Reactivado',
                '¡Buenas noticias! Tu servicio se encuentra activo nuevamente. Gracias por tu pago.',
                'status_reactivated'
            );
            localStorage.removeItem('notify_status_suspended');
        }
        localStorage.setItem('last_user_status', status);

        // 2. New Payment Registered (Invoice marked as paid)
        const paidInvoices = invoices.filter(inv => inv.estado === 'pagada');
        const knownPaidInvoices = JSON.parse(localStorage.getItem('known_paid_invoices') || '[]');

        paidInvoices.forEach(inv => {
            const id = inv.id_factura || inv.id || inv.folio;
            if (id && !knownPaidInvoices.includes(id)) {
                notificationService.sendNotification(
                    '💰 Pago Registrado',
                    `Hemos recibido tu pago por la factura #${id}. ¡Gracias!`,
                    `payment_${id}`
                );
                knownPaidInvoices.push(id);
            }
        });
        localStorage.setItem('known_paid_invoices', JSON.stringify(knownPaidInvoices.slice(-50))); // Keep last 50

        // 3. New Payment Promise Created
        if (promiseDate) {
            const lastKnownPromise = localStorage.getItem('last_known_promise_date');
            if (promiseDate !== lastKnownPromise) {
                notificationService.sendNotification(
                    '🤝 Promesa de Pago',
                    `Se ha registrado tu promesa de pago para el día ${new Date(promiseDate).toLocaleDateString()}.`,
                    'promise_created'
                );
                localStorage.setItem('last_known_promise_date', promiseDate);
            }
        }

        // 4. Payment Reminder (Between 20th and 26th)
        const today = new Date();
        const day = today.getDate();
        const hasBalance = parseFloat(user.balance || 0) > 0 || invoices.some(inv => inv.estado === 'pendiente');

        if (day >= 20 && day <= 26 && hasBalance) {
            notificationService.sendNotification(
                '📅 Próximo a Vencer',
                'Tu servicio vence pronto. Por favor cancela antes del 26 para evitar la suspensión.',
                'payment_due'
            );
        }

        // 5. Ticket Resolution
        const resolvedTicket = tickets.find(t => t.estado === 'Resuelto' || t.estado === 'Cerrado');
        if (resolvedTicket) {
            const ticketKey = `ticket_${resolvedTicket.id_ticket}`;
            notificationService.sendNotification(
                '✅ Soporte Técnico',
                `Tu solicitud "${resolvedTicket.asunto}" ha sido atendida con éxito.`,
                ticketKey
            );
        }
    }
};

export default notificationService;
