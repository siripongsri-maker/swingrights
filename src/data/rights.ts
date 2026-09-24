/**
 * สิทธิของผู้ต้องหา — content data for the /rights page.
 * Kept in a separate data file so the screening result screen can reuse it
 * (match by `tags` against case violation types later).
 */
import {
  PhoneCall, Scale, MessageSquareOff, MessagesSquare, ShieldCheck, Languages,
  FileText, DoorOpen, Gavel, BadgeCheck, ArrowUpRight, HeartHandshake,
  Lock, Users, Stethoscope, type LucideIcon,
} from 'lucide-react';

export type RightsSectionId = 'arrest' | 'investigation' | 'detention';

export interface RightItem {
  id: number;
  section: RightsSectionId;
  title: string;
  body: string;
  tags: string[];
  icon: LucideIcon;
}

export const RIGHTS_SECTIONS: RightsSectionId[] = ['arrest', 'investigation', 'detention'];

export const RIGHTS: RightItem[] = [
  {
    id: 1, section: 'arrest',
    title: 'สิทธิแจ้งญาติหรือคนที่ไว้ใจ',
    body: 'เมื่อถูกจับ เจ้าหน้าที่ต้องแจ้งให้ญาติหรือคนที่ผู้ต้องหาเลือกทราบ และมีสิทธิให้ทนายหรือคนที่ไว้ใจเข้าฟังการสอบสวนในสถานีตำรวจได้',
    tags: ['arrest', 'family', 'lawyer'], icon: PhoneCall,
  },
  {
    id: 2, section: 'arrest',
    title: 'สิทธิที่จะมีทนายความช่วยเหลือ',
    body: 'ถ้าเราไม่มีทนาย รัฐต้องจัดหาทนายให้ฟรี',
    tags: ['lawyer', 'legal-aid'], icon: Scale,
  },
  {
    id: 3, section: 'arrest',
    title: 'สิทธิที่จะไม่พูดสิ่งที่ทำให้ตัวเองเสียหาย',
    body: 'เมื่อเราถูกจับ เรามีสิทธิที่จะไม่ตอบคำถามหรือพูดในสิ่งที่อาจทำให้ถูกฟ้องหรือถูกลงโทษ',
    tags: ['arrest', 'silence'], icon: MessageSquareOff,
  },
  {
    id: 4, section: 'arrest',
    title: 'สิทธิที่จะเลือกให้การหรือไม่ให้การก็ได้',
    body: 'ถ้าให้การ คำพูดนั้นสามารถใช้เป็นหลักฐานในศาลได้',
    tags: ['statement', 'silence'], icon: MessagesSquare,
  },
  {
    id: 5, section: 'arrest',
    title: 'สิทธิที่จะถูกมองว่า "ยังไม่ผิด" จนกว่าศาลจะตัดสินถึงที่สุด',
    body: 'เจ้าหน้าที่หรือใครก็ตามไม่สามารถปฏิบัติกับเราเหมือนเป็นคนผิดได้',
    tags: ['dignity', 'presumption'], icon: ShieldCheck,
  },
  {
    id: 6, section: 'arrest',
    title: 'สิทธิที่จะมีล่ามหรือภาษามือช่วย',
    body: 'สำหรับคนที่ไม่เข้าใจภาษาไทย หรือมีปัญหาการสื่อสาร',
    tags: ['interpreter', 'accessibility', 'migrant'], icon: Languages,
  },
  {
    id: 7, section: 'investigation',
    title: 'สิทธิในการแก้ข้อกล่าวหาและแสดงข้อเท็จจริงที่เป็นประโยชน์ต่อคดี',
    body: 'เรามีสิทธิอธิบายและนำเสนอข้อมูลฝั่งเราต่อเจ้าหน้าที่และศาล',
    tags: ['defense', 'statement'], icon: FileText,
  },
  {
    id: 8, section: 'investigation',
    title: 'สิทธิที่จะถูกปล่อยตัว ถ้าถูกจับหรือคุมขังโดยไม่ถูกต้องตามกฎหมาย',
    body: 'การจับหรือคุมขังที่ไม่เป็นไปตามกฎหมาย เราขอให้ปล่อยตัวได้',
    tags: ['arrest', 'unlawful-detention'], icon: DoorOpen,
  },
  {
    id: 9, section: 'investigation',
    title: 'สิทธิที่จะได้รับการสอบสวนและพิจารณาคดีอย่างถูกต้อง รวดเร็ว และเป็นธรรม',
    body: 'ไม่ควรถูกดึงเรื่องให้ยืดเยื้อโดยไม่จำเป็น',
    tags: ['fair-trial'], icon: Gavel,
  },
  {
    id: 10, section: 'investigation',
    title: 'สิทธิในการขอประกันตัว',
    body: 'ศาลต้องพิจารณาการขอประกันตัวอย่างรวดเร็ว และไม่เรียกหลักประกันเกินความจำเป็น',
    tags: ['bail'], icon: BadgeCheck,
  },
  {
    id: 11, section: 'investigation',
    title: 'สิทธิในการอุทธรณ์ หากไม่ได้รับการประกันตัว',
    body: 'ถ้าศาลไม่ให้ประกัน เรายื่นอุทธรณ์คำสั่งนั้นได้',
    tags: ['bail', 'appeal'], icon: ArrowUpRight,
  },
  {
    id: 12, section: 'investigation',
    title: 'สิทธิที่จะได้รับการดูแล หากไม่สามารถต่อสู้คดีได้เพราะปัญหาสุขภาพจิต',
    body: 'หากมีปัญหาสุขภาพจิตจนไม่พร้อมต่อสู้คดี ต้องได้รับการดูแลอย่างเหมาะสมก่อน',
    tags: ['mental-health', 'care'], icon: HeartHandshake,
  },
  {
    id: 13, section: 'detention',
    title: 'สิทธิพบและปรึกษาทนายเป็นการส่วนตัว',
    body: 'การพูดคุยกับทนายต้องเป็นส่วนตัว ไม่มีเจ้าหน้าที่ฟังอยู่',
    tags: ['lawyer', 'privacy'], icon: Lock,
  },
  {
    id: 14, section: 'detention',
    title: 'สิทธิในการติดต่อหรือเยี่ยมญาติได้ตามสมควร',
    body: 'ระหว่างถูกควบคุมตัว เรายังติดต่อและให้ญาติมาเยี่ยมได้',
    tags: ['family', 'detention'], icon: Users,
  },
  {
    id: 15, section: 'detention',
    title: 'สิทธิได้รับการรักษาพยาบาลทันทีเมื่อเจ็บป่วย',
    body: 'เจ็บป่วยระหว่างถูกควบคุมตัว ต้องได้รับการรักษาโดยไม่ล่าช้า',
    tags: ['health', 'detention'], icon: Stethoscope,
  },
];
