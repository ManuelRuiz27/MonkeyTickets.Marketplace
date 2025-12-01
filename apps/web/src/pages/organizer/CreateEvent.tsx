import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { CreateEventForm } from '../../components/organizer/CreateEventForm';

export function CreateEventPage() {
    const rawUser = localStorage.getItem('authUser');
    const user = rawUser ? JSON.parse(rawUser) : undefined;

    return (
        <DashboardLayout type="organizer" user={user}>
            <div className="max-w-4xl mx-auto">
                <CreateEventForm />
            </div>
        </DashboardLayout>
    );
}
