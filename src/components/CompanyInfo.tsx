import { Mail, MapPin, Phone } from 'lucide-react';

export default function CompanyInfo() {
	return (
		<div className='rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 space-y-1.5'>
			<p className='text-xs font-bold text-sidebar-foreground tracking-wide'>
				WISEBUDDY AI LTD
			</p>
			<div className='flex items-start gap-1.5 text-muted-foreground'>
				<MapPin className='w-3 h-3 mt-0.5 shrink-0' />
				<p className='text-xs leading-tight'>
					128, City Road, London, EC1V 2NX, United Kingdom
				</p>
			</div>
			<a
				href='mailto:wisebuddy@wisebuddy.ai'
				className='flex items-center gap-1.5 text-muted-foreground hover:text-sidebar-foreground transition-colors'
			>
				<Mail className='w-3 h-3 shrink-0' />
				<span className='text-xs'>wisebuddy@wisebuddy.ai</span>
			</a>
			<a
				href='tel:+44684744758'
				className='flex items-center gap-1.5 text-muted-foreground hover:text-sidebar-foreground transition-colors'
			>
				<Phone className='w-3 h-3 shrink-0' />
				<span className='text-xs'>+44 684744758</span>
			</a>
		</div>
	);
}
