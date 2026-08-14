/* Single source of truth for program facts used by course, schedule and registration surfaces. */
window.VSC_PROGRAM_INFO = {
  'ai-starter': {
    name: 'AI STARTER',
    shortName: 'AI Starter',
    price: '999.000đ',
    format: 'online',
    formatLabel: 'Online trực tiếp',
    location: 'Google Meet',
    durationLabel: '02 buổi × 120 phút',
    totalDuration: '4 giờ',
    minCapacity: 8,
    maxCapacity: 25,
    classSizeLabel: '8–25 học viên'
  },
  'ai-foundation': {
    name: 'AI ỨNG DỤNG TRONG CÔNG VIỆC',
    shortName: 'AI ứng dụng trong công việc',
    price: '999.000đ',
    format: 'online',
    formatLabel: 'Online trực tiếp',
    location: 'Google Meet',
    durationLabel: '02 buổi × 120 phút',
    totalDuration: '04 giờ',
    minCapacity: 8,
    maxCapacity: 25,
    classSizeLabel: '8–25 học viên',
    scheduleLabel: 'Thứ 3 & Thứ 5 | 19:00–21:00',
    supportLabel: 'Video 30 ngày + Zalo 14 ngày'
  },
  'ai-agent-automation': {
    name: 'AI AGENT & AUTOMATION',
    shortName: 'AI Agent & Automation',
    price: '2.499.000đ',
    format: 'offline',
    formatLabel: 'Offline',
    venueName: 'The Comma Coffee',
    venueAddress: '21 Hoa Mai, Phường Cầu Kiệu, TP.HCM',
    primaryPlatform: 'AI Agent',
    practiceTools: ['AI Agent'],
    practiceBadge: 'XÂY AI AGENT THỰC TẾ',
    maxCapacity: 15,
    classSizeLabel: 'Tối đa 15 học viên'
  }
};

const aiStarter = window.VSC_PROGRAM_INFO['ai-starter'];
const aiFoundation = window.VSC_PROGRAM_INFO['ai-foundation'];
const aiAgent = window.VSC_PROGRAM_INFO['ai-agent-automation'];

/* Single source of truth for every VSC Academy session/calendar surface. */
window.VSC_SCHEDULES = [
  {id:'evt-001',slug:'ai-starter-thang-8',title:aiStarter.name,shortTitle:aiStarter.shortName,programId:'ai-starter',type:'course',date:'2026-08-15',startTime:'09:00',endTime:'11:00',format:aiStarter.format,formatLabel:aiStarter.formatLabel,location:aiStarter.location,price:aiStarter.price,durationLabel:aiStarter.durationLabel,totalDuration:aiStarter.totalDuration,minCapacity:aiStarter.minCapacity,capacity:aiStarter.maxCapacity,classSizeLabel:aiStarter.classSizeLabel,remainingSeats:null,status:'open',description:'Khóa học nhập môn giúp người học bắt đầu với AI từ một bài toán thực tế qua 02 buổi học trực tuyến trực tiếp.',registrationUrl:'dang-ky.html?session=ai-starter-thang-8',detailUrl:'khoa-hoc/ai-starter/index.html'},
  {id:'evt-002',slug:'ai-ung-dung-cong-viec',title:aiFoundation.name,shortTitle:aiFoundation.shortName,programId:'ai-foundation',type:'course',startDate:'2026-08-25',date:'2026-08-25',startTime:'19:00',endTime:'21:00',format:aiFoundation.format,formatLabel:aiFoundation.formatLabel,location:aiFoundation.location,price:aiFoundation.price,durationLabel:aiFoundation.durationLabel,totalDuration:aiFoundation.totalDuration,minCapacity:aiFoundation.minCapacity,capacity:aiFoundation.maxCapacity,classSizeLabel:aiFoundation.classSizeLabel,scheduleLabel:aiFoundation.scheduleLabel,supportLabel:aiFoundation.supportLabel,remainingSeats:12,status:'open',description:'Xây nền tảng tư duy, kỹ năng và quy trình để đưa AI vào công việc hằng ngày một cách có phương pháp.',registrationUrl:'dang-ky.html?session=ai-ung-dung-cong-viec',detailUrl:'khoa-hoc/ai-ung-dung-cong-viec/index.html'},
  {id:'evt-003',slug:'ai-agent-automation',title:aiAgent.name,shortTitle:aiAgent.shortName,programId:'ai-agent-automation',type:'course',date:'2026-08-29',startTime:'13:30',endTime:'17:00',format:aiAgent.format,formatLabel:aiAgent.formatLabel,venueName:aiAgent.venueName,venueAddress:aiAgent.venueAddress,location:`${aiAgent.venueName} · ${aiAgent.venueAddress}`,primaryPlatform:aiAgent.primaryPlatform,practiceTools:aiAgent.practiceTools,price:aiAgent.price,capacity:aiAgent.maxCapacity,classSizeLabel:aiAgent.classSizeLabel,remainingSeats:4,status:'limited',description:'Dành cho người muốn xây workflow, tự động hóa và AI Agent phục vụ công việc thực tế.',registrationUrl:'dang-ky.html?session=ai-agent-automation',detailUrl:'khoa-hoc/ai-agent-automation/index.html'},
  {id:'evt-004',slug:'ai-workflow-online',title:'AI WORKFLOW THỰC HÀNH',shortTitle:'AI Workflow thực hành',programId:'ai-workflow-workshop',type:'workshop',date:'2026-09-05',startTime:'19:30',endTime:'21:30',format:'online',location:'Google Meet',price:'799.000đ',capacity:15,remainingSeats:0,status:'full',description:'Thiết kế một quy trình làm việc kết hợp AI có thể sử dụng lặp lại trong công việc.',registrationUrl:'dang-ky.html?session=ai-workflow-online',detailUrl:'khoa-hoc/ai-ung-dung-cong-viec/index.html'},
  {id:'evt-005',slug:'ai-starter-thang-9',title:aiStarter.name,shortTitle:aiStarter.shortName,programId:'ai-starter',type:'course',date:'2026-09-19',startTime:'09:00',endTime:'11:00',format:aiStarter.format,formatLabel:aiStarter.formatLabel,location:aiStarter.location,price:aiStarter.price,durationLabel:aiStarter.durationLabel,totalDuration:aiStarter.totalDuration,minCapacity:aiStarter.minCapacity,capacity:aiStarter.maxCapacity,classSizeLabel:aiStarter.classSizeLabel,remainingSeats:null,status:'upcoming',description:'Khóa học nhập môn giúp người học bắt đầu với AI từ một bài toán thực tế qua 02 buổi học trực tuyến trực tiếp.',registrationUrl:'dang-ky.html?session=ai-starter-thang-9',detailUrl:'khoa-hoc/ai-starter/index.html'}
];
