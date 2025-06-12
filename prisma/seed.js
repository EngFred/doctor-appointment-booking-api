import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clear existing data (optional, comment out to append data)
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  // Create Users (11 Patients, 4 Admins)
  const hashedPassword = await bcrypt.hash('password123', 10);
  const users = await prisma.user.createMany({
    data: [
      // 11 Patients
      { id: uuidv4(), firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Sarah', lastName: 'Wilson', email: 'sarah.wilson@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'David', lastName: 'Taylor', email: 'david.taylor@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Emma', lastName: 'Johnson', email: 'emma.johnson@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'James', lastName: 'Davis', email: 'james.davis@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Olivia', lastName: 'Clark', email: 'olivia.clark@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'William', lastName: 'Lewis', email: 'william.lewis@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Sophia', lastName: 'Walker', email: 'sophia.walker@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Liam', lastName: 'Hall', email: 'liam.hall@example.com', password: hashedPassword, role: 'PATIENT', createdAt: new Date(), updatedAt: new Date() },
      // 4 Admins
      { id: uuidv4(), firstName: 'Admin', lastName: 'One', email: 'admin1@example.com', password: hashedPassword, role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Admin', lastName: 'Two', email: 'admin2@example.com', password: hashedPassword, role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Admin', lastName: 'Three', email: 'admin3@example.com', password: hashedPassword, role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Admin', lastName: 'Four', email: 'admin4@example.com', password: hashedPassword, role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created users:', users);

  // Fetch users for relations
  const patients = await prisma.user.findMany({ where: { role: 'PATIENT' } });

  // Create 10 Hospitals
  const hospitals = await prisma.hospital.createMany({
    data: [
      { id: uuidv4(), name: 'City General', address: '123 Main St, Kampala', phone: '+256700123456', latitude: 0.347596, longitude: 32.582520, services: ['Cardiology', 'Orthopedics'], contactEmail: 'contact@citygeneral.com', rating: 4.5, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Hope Medical', address: '456 Elm St, Nairobi', phone: '+254700987654', latitude: -1.292066, longitude: 36.821946, services: ['Pediatrics', 'Neurology'], contactEmail: 'info@hopemedical.com', rating: 4.2, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Sunrise Clinic', address: '789 Oak St, Dar es Salaam', phone: '+255700123456', latitude: -6.792354, longitude: 39.208328, services: ['General Medicine'], contactEmail: 'info@sunrise.com', rating: 4.0, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Green Valley', address: '101 Pine St, Mombasa', phone: '+254700456789', latitude: -4.043477, longitude: 39.668206, services: ['Dermatology'], contactEmail: 'contact@greenvalley.com', rating: 4.3, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Unity Hospital', address: '202 Cedar St, Kampala', phone: '+256700789123', latitude: 0.347596, longitude: 32.582520, services: ['Oncology'], contactEmail: 'info@unity.com', rating: 4.7, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Peace Medical', address: '303 Maple St, Nairobi', phone: '+254700321654', latitude: -1.292066, longitude: 36.821946, services: ['Cardiology'], contactEmail: 'contact@peace.com', rating: 4.1, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Star Health', address: '404 Birch St, Arusha', phone: '+255700987654', latitude: -3.386925, longitude: 36.682993, services: ['Orthopedics'], contactEmail: 'info@starhealth.com', rating: 4.4, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Care Center', address: '505 Spruce St, Kisumu', phone: '+254700654321', latitude: -0.091702, longitude: 34.767956, services: ['Pediatrics'], contactEmail: 'contact@carecenter.com', rating: 4.0, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Life Hospital', address: '606 Willow St, Gulu', phone: '+256700456123', latitude: 2.774573, longitude: 32.298073, services: ['Neurology'], contactEmail: 'info@lifehospital.com', rating: 4.6, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), name: 'Harmony Clinic', address: '707 Ash St, Eldoret', phone: '+254700789456', latitude: 0.514277, longitude: 35.269780, services: ['General Medicine'], contactEmail: 'contact@harmony.com', rating: 4.2, createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created hospitals:', hospitals);

  // Fetch hospitals for relations
  const hospitalList = await prisma.hospital.findMany();

  // Create 10 Doctors
  const doctors = await prisma.doctor.createMany({
    data: [
      { id: uuidv4(), firstName: 'Alice', lastName: 'Brown', specialty: 'Cardiology', hospitalId: hospitalList[0].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Bob', lastName: 'Wilson', specialty: 'Pediatrics', hospitalId: hospitalList[1].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Clara', lastName: 'Davis', specialty: 'Orthopedics', hospitalId: hospitalList[2].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Daniel', lastName: 'Moore', specialty: 'Neurology', hospitalId: hospitalList[3].id, createdAt: new Date(), updatedAt:  new Date() },
      { id: uuidv4(), firstName: 'Emma', lastName: 'Taylor', specialty: 'Dermatology', hospitalId: hospitalList[4].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Frank', lastName: 'Anderson', specialty: 'Oncology', hospitalId: hospitalList[5].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Grace', lastName: 'Thomas', specialty: 'Cardiology', hospitalId: hospitalList[6].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Henry', lastName: 'Jackson', specialty: 'Pediatrics', hospitalId: hospitalList[7].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Isabella', lastName: 'White', specialty: 'Neurology', hospitalId: hospitalList[8].id, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), firstName: 'Jack', lastName: 'Harris', specialty: 'Orthopedics', hospitalId: hospitalList[9].id, createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created doctors:', doctors);

  // Fetch doctors for relations
  const doctorList = await prisma.doctor.findMany();

  // Create 6 Availability Slots
  const availability = await prisma.availability.createMany({
    data: [
      { id: uuidv4(), doctorId: doctorList[0].id, startTime: new Date('2025-06-15T09:00:00Z'), endTime: new Date('2025-06-15T10:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), doctorId: doctorList[1].id, startTime: new Date('2025-06-16T14:00:00Z'), endTime: new Date('2025-06-16T15:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), doctorId: doctorList[2].id, startTime: new Date('2025-06-17T10:00:00Z'), endTime: new Date('2025-06-17T11:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), doctorId: doctorList[3].id, startTime: new Date('2025-06-18T13:00:00Z'), endTime: new Date('2025-06-18T14:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), doctorId: doctorList[4].id, startTime: new Date('2025-06-19T15:00:00Z'), endTime: new Date('2025-06-19T16:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), doctorId: doctorList[5].id, startTime: new Date('2025-06-20T11:00:00Z'), endTime: new Date('2025-06-20T12:00:00Z'), status: 'AVAILABLE', createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created availability slots:', availability);

  // Fetch availability for relations
  const availabilityList = await prisma.availability.findMany();

  // Create 6 Payments
  const payments = await prisma.payment.createMany({
    data: [
      { id: uuidv4(), userId: patients[0].id, amount: 50000, currency: 'UGX', paymentMethod: 'MTN', paymentType: 'MOBILE_MONEY', phone: '+256700123456', email: patients[0].email, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[1].id, amount: 75000, currency: 'KES', paymentMethod: 'AIRTEL', paymentType: 'MOBILE_MONEY', phone: '+254700987654', email: patients[1].email, status: 'COMPLETED', paymentDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[2].id, amount: 100000, currency: 'UGX', paymentMethod: 'MTN', paymentType: 'MOBILE_MONEY', phone: '+256700456789', email: patients[2].email, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[3].id, amount: 60000, currency: 'KES', paymentMethod: 'AIRTEL', paymentType: 'MOBILE_MONEY', phone: '+254700123456', email: patients[3].email, status: 'COMPLETED', paymentDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[4].id, amount: 80000, currency: 'UGX', paymentMethod: 'MTN', paymentType: 'MOBILE_MONEY', phone: '+256700789123', email: patients[4].email, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[5].id, amount: 70000, currency: 'KES', paymentMethod: 'AIRTEL', paymentType: 'MOBILE_MONEY', phone: '+254700654321', email: patients[5].email, status: 'COMPLETED', paymentDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created payments:', payments);

  // Fetch payments for relations
  const paymentList = await prisma.payment.findMany();

  // Create 6 Appointments
  const appointments = await prisma.appointment.createMany({
    data: [
      { id: uuidv4(), patientId: patients[0].id, doctorId: doctorList[0].id, availabilityId: availabilityList[0].id, paymentId: paymentList[0].id, scheduledAt: new Date('2025-06-15T09:00:00Z'), type: 'IN_PERSON', status: 'PENDING', location: hospitalList[0].address, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), patientId: patients[1].id, doctorId: doctorList[1].id, availabilityId: availabilityList[1].id, paymentId: paymentList[1].id, scheduledAt: new Date('2025-06-16T14:00:00Z'), type: 'VIRTUAL', consultationType: 'VIDEO', sessionId: 'agora-session-123', startTime: new Date('2025-06-16T14:00:00Z'), endTime: new Date('2025-06-16T14:30:00Z'), duration: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), patientId: patients[2].id, doctorId: doctorList[2].id, availabilityId: availabilityList[2].id, paymentId: paymentList[2].id, scheduledAt: new Date('2025-06-17T10:00:00Z'), type: 'IN_PERSON', status: 'PENDING', location: hospitalList[2].address, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), patientId: patients[3].id, doctorId: doctorList[3].id, availabilityId: availabilityList[3].id, paymentId: paymentList[3].id, scheduledAt: new Date('2025-06-18T13:00:00Z'), type: 'VIRTUAL', consultationType: 'AUDIO', sessionId: 'agora-session-456', startTime: new Date('2025-06-18T13:00:00Z'), endTime: new Date('2025-06-18T13:30:00Z'), duration: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), patientId: patients[4].id, doctorId: doctorList[4].id, availabilityId: availabilityList[4].id, paymentId: paymentList[4].id, scheduledAt: new Date('2025-06-19T15:00:00Z'), type: 'IN_PERSON', status: 'PENDING', location: hospitalList[4].address, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), patientId: patients[5].id, doctorId: doctorList[5].id, availabilityId: availabilityList[5].id, paymentId: paymentList[5].id, scheduledAt: new Date('2025-06-20T11:00:00Z'), type: 'VIRTUAL', consultationType: 'TEXT', sessionId: 'agora-session-789', startTime: new Date('2025-06-20T11:00:00Z'), endTime: new Date('2025-06-20T11:30:00Z'), duration: 30, createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created appointments:', appointments);

  // Fetch appointments for relations
  const appointmentList = await prisma.appointment.findMany();

  // Create 6 Messages
  const messages = await prisma.message.createMany({
    data: [
      { id: uuidv4(), appointmentId: appointmentList[1].id, content: 'Hello, ready for our video call?', messageType: 'TEXT', senderId: patients[1].id, receiverId: doctorList[1].id, sentAt: new Date('2025-06-16T13:55:00Z') },
      { id: uuidv4(), appointmentId: appointmentList[1].id, content: 'Yes, I’ll join shortly.', messageType: 'TEXT', senderId: patients[1].id, receiverId: doctorList[1].id, sentAt: new Date('2025-06-16T13:56:00Z') },
      { id: uuidv4(), appointmentId: appointmentList[3].id, content: 'Please confirm audio setup.', messageType: 'TEXT', senderId: patients[3].id, receiverId: doctorList[3].id, sentAt: new Date('2025-06-18T12:55:00Z') },
      { id: uuidv4(), appointmentId: appointmentList[3].id, content: 'Audio is working fine.', messageType: 'TEXT', senderId: patients[3].id, receiverId: doctorList[3].id, sentAt: new Date('2025-06-18T12:56:00Z') },
      { id: uuidv4(), appointmentId: appointmentList[5].id, content: 'I have a question about my condition.', messageType: 'TEXT', senderId: patients[5].id, receiverId: doctorList[5].id, sentAt: new Date('2025-06-20T10:55:00Z') },
      { id: uuidv4(), appointmentId: appointmentList[5].id, content: 'Please describe your symptoms.', messageType: 'TEXT', senderId: patients[5].id, receiverId: doctorList[5].id, sentAt: new Date('2025-06-20T10:56:00Z') },
    ],
  });
  console.log('Created messages:', messages);

  // Create 6 Notifications
  const notifications = await prisma.notification.createMany({
    data: [
      { id: uuidv4(), userId: patients[0].id, title: 'Appointment Scheduled', body: 'Your appointment with Dr. Alice is set for June 15, 2025.', notificationType: 'APPOINTMENT_CONFIRMED', status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[1].id, title: 'Payment Successful', body: 'Your payment of 75,000 KES was successful.', notificationType: 'PAYMENT_SUCCESS', status: 'SENT', sentAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[2].id, title: 'Appointment Scheduled', body: 'Your appointment with Dr. Clara is set for June 17, 2025.', notificationType: 'APPOINTMENT_CONFIRMED', status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[3].id, title: 'Payment Successful', body: 'Your payment of 60,000 KES was successful.', notificationType: 'PAYMENT_SUCCESS', status: 'SENT', sentAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[4].id, title: 'Appointment Reminder', body: 'Your appointment with Dr. Emma is on June 19, 2025.', notificationType: 'APPOINTMENT_CONFIRMED', status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), userId: patients[5].id, title: 'New Message', body: 'You have a new message from Dr. Frank.', notificationType: 'MESSAGE_RECEIVED', status: 'PENDING', createdAt: new Date(), updatedAt: new Date() },
    ],
  });
  console.log('Created notifications:', notifications);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });