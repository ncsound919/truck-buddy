# Field Operations Model

This document defines a privacy-safe, carrier-neutral model for translating warehouse and delivery paperwork into TruckBuddy data. It intentionally contains no real customer, carrier, employee, shipment, facility, address, email, or phone information.

## Inputs

TruckBuddy can receive the same fields from three sources:

- On-device OCR of a bill of lading, manifest, staging sheet, or shipping document
- Barcode/QR scan
- Manual warehouse or driver entry

The shared parser recognizes generic load IDs, BOL IDs, order numbers, staging slots, pallet counts, cabinet/piece counts, damage or shortage wording, and accessorial instructions.

## Staging record

A staging record should connect a load or order to one or more warehouse coordinates such as a bay, row, dock, or slot. It should retain pallet and piece counts, observed exceptions, the operator who recorded the event, and a timestamp. Later portal work can persist this as `staging_events`; the cab app can first use the model locally.

## Damage defense

When freight is accepted from a dock, a driver should be able to record pre-existing damage or shortage before departure. A future UI must capture: load/order reference, staging location, exception category, notes, timestamp, and one or more photos. Evidence must be immutable after sync and attributable to the actor who created it.

## POD policy

A delivery can be marked complete only when location verification is present and either a POD photo or signature is captured. If neither is possible, the driver must enter an explicit exception reason. This avoids silent POD gaps while still allowing legitimate failed or refused deliveries to be closed correctly.

## Accessorials

The initial deterministic vocabulary is:

- Inside delivery
- Mattress or old-item removal
- Liftgate requirement
- Two-person crew
- Assembly or installation

OCR detection is an assistive signal, not a billing decision. Drivers should confirm detected services, and the portal should compare confirmed work with the contracted rate before invoice generation.

## Integration sequence

1. Add this pure domain module and automated tests.
2. Call `parseFieldLogisticsDocument` after OCR text recognition and show extracted fields for driver confirmation.
3. Persist confirmed staging, damage, accessorial, and POD events through the existing API seam.
4. Add organization-scoped portal views and RLS policies before enabling cross-user reporting.
