import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { CreateEventForm } from '../../components/organizer/CreateEventForm';

export function CreateEventPage() {
    return (
        <DashboardLayout type="organizer" user={{ email: localStorage.getItem('authUser') }}>
            <div className="max-w-4xl mx-auto">
                <CreateEventForm />
            </div>
        </DashboardLayout>
    );
}
