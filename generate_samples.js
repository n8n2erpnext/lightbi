const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'sample-data-audit');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function writeCsv(domain, name, content) {
  const dir = path.join(outDir, domain);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), content.trim() + '\n');
}

// 1. Operations
const opGood = `
driver_id,driver_name,route_code,shipment_no,delivery_status,sla_met,warehouse_id,delay_minutes,vehicle_plate
DRV001,John Doe,RT-N01,SHP-1001,Delivered,Yes,WH-10,0,V-8812
DRV002,Jane Smith,RT-S02,SHP-1002,In Transit,Yes,WH-12,0,V-3311
DRV001,John Doe,RT-N01,SHP-1003,Delayed,No,WH-10,45,V-8812
DRV003,Bob Lee,RT-E05,SHP-1004,Delivered,Yes,WH-11,0,V-9922
DRV004,Alice Kim,RT-W03,SHP-1005,Failed,No,WH-10,120,V-1100
DRV002,Jane Smith,RT-S02,SHP-1006,Delivered,Yes,WH-12,0,V-3311
DRV005,Tom Hank,RT-N02,SHP-1007,In Transit,Yes,WH-11,0,V-5544
DRV003,Bob Lee,RT-E05,SHP-1008,Delivered,Yes,WH-11,0,V-9922
DRV001,John Doe,RT-N01,SHP-1009,Delayed,No,WH-10,30,V-8812
DRV004,Alice Kim,RT-W03,SHP-1010,Delivered,Yes,WH-10,0,V-1100
DRV006,Eve Smith,RT-S03,SHP-1011,Delivered,Yes,WH-12,0,V-2211
DRV005,Tom Hank,RT-N02,SHP-1012,Delivered,Yes,WH-11,0,V-5544
DRV002,Jane Smith,RT-S02,SHP-1013,Delayed,No,WH-12,60,V-3311
DRV003,Bob Lee,RT-E05,SHP-1014,Delivered,Yes,WH-11,0,V-9922
DRV001,John Doe,RT-N01,SHP-1015,Delivered,Yes,WH-10,0,V-8812
`;

const opBroken = `
tên tài xế,tuyến,mã_đơn,tình_trạng,sla,kho,chậm,xe,tuyến_2
John Doe,RT-N01,1001,Delivered,1,WH-10,0,V-8812,RT-N01
Jane Smith,,1002,In Transit,1,WH-12,,V-3311,
John Doe,RT-N01,1003,Delayed,0,,45,V-8812,RT-N01
Bob Lee,RT-E05,,Delivered,1,WH-11,0,V-9922,RT-E05
Alice Kim,RT-W03,1005,Failed,0,WH-10,120,,RT-W03
Jane Smith,RT-S02,1006,Delivered,1,WH-12,0,V-3311,RT-S02
Tom Hank,RT-N02,1007,In Transit,1,WH-11,0,V-5544,RT-N02
Bob Lee,,1008,Delivered,1,WH-11,0,V-9922,
John Doe,RT-N01,1009,Delayed,0,WH-10,30,V-8812,RT-N01
Alice Kim,RT-W03,1010,Delivered,1,WH-10,,V-1100,RT-W03
Eve Smith,RT-S03,1011,Delivered,1,WH-12,0,V-2211,RT-S03
Tom Hank,RT-N02,1012,,1,WH-11,0,V-5544,RT-N02
Jane Smith,RT-S02,1013,Delayed,0,WH-12,60,V-3311,RT-S02
Bob Lee,RT-E05,1014,Delivered,1,,0,V-9922,RT-E05
John Doe,RT-N01,1015,Delivered,1,WH-10,0,V-8812,RT-N01
`;

writeCsv('operations', 'good_operations.csv', opGood);
writeCsv('operations', 'broken_operations.csv', opBroken);

// 2. Revenue
const revGood = `
order_id,product_name,revenue_amount,sales_amount,branch_location,salesperson_name,discount_applied,customer_id
ORD-501,Widget A,150.00,150.00,New York,Jim Halpert,0.00,CUST-01
ORD-502,Widget B,200.00,250.00,Chicago,Dwight Schrute,50.00,CUST-02
ORD-503,Widget A,150.00,150.00,New York,Jim Halpert,0.00,CUST-03
ORD-504,Widget C,300.00,300.00,Scranton,Michael Scott,0.00,CUST-01
ORD-505,Widget B,220.00,250.00,Chicago,Dwight Schrute,30.00,CUST-04
ORD-506,Widget D,500.00,500.00,Stamford,Andy Bernard,0.00,CUST-05
ORD-507,Widget A,130.00,150.00,New York,Jim Halpert,20.00,CUST-06
ORD-508,Widget C,300.00,300.00,Scranton,Michael Scott,0.00,CUST-02
ORD-509,Widget B,250.00,250.00,Chicago,Dwight Schrute,0.00,CUST-07
ORD-510,Widget D,450.00,500.00,Stamford,Andy Bernard,50.00,CUST-08
ORD-511,Widget A,150.00,150.00,New York,Jim Halpert,0.00,CUST-09
ORD-512,Widget C,270.00,300.00,Scranton,Michael Scott,30.00,CUST-10
ORD-513,Widget B,250.00,250.00,Chicago,Dwight Schrute,0.00,CUST-01
ORD-514,Widget A,150.00,150.00,New York,Jim Halpert,0.00,CUST-11
ORD-515,Widget D,500.00,500.00,Stamford,Andy Bernard,0.00,CUST-12
`;

const revBroken = `
đơn_hàng,sản phẩm,doanh thu,chi nhánh,nv bh,chiết khấu,khách hàng,doanh thu 2
501,Widget A,150.00,New York,Jim Halpert,0,CUST-01,150.00
502,Widget B,200.00,Chicago,Dwight Schrute,50,CUST-02,200.00
503,,150.00,New York,,0,CUST-03,150.00
504,Widget C,300.00,Scranton,Michael Scott,0,,300.00
,Widget B,220.00,Chicago,Dwight Schrute,30,CUST-04,220.00
506,Widget D,500.00,,Andy Bernard,0,CUST-05,500.00
507,Widget A,130.00,New York,Jim Halpert,,CUST-06,130.00
508,Widget C,300.00,Scranton,Michael Scott,0,CUST-02,300.00
509,Widget B,,Chicago,Dwight Schrute,0,CUST-07,
510,Widget D,450.00,Stamford,,50,CUST-08,450.00
511,,150.00,New York,Jim Halpert,0,CUST-09,150.00
512,Widget C,270.00,Scranton,Michael Scott,30,CUST-10,270.00
513,Widget B,250.00,Chicago,Dwight Schrute,0,,250.00
514,Widget A,150.00,,Jim Halpert,0,CUST-11,150.00
515,Widget D,500.00,Stamford,Andy Bernard,0,CUST-12,500.00
`;

writeCsv('revenue', 'good_revenue.csv', revGood);
writeCsv('revenue', 'broken_revenue.csv', revBroken);

// 3. Inventory
const invGood = `
sku_code,product_desc,inventory_level,stock_qty,warehouse_id,stock_movement_type,inbound_qty,outbound_qty,supplier_name,replenishment_flag,stock_age_days
SKU-101,Laptop Pro,High,500,WH-East,Inbound,100,0,TechSupply Inc,No,15
SKU-102,Mouse X,Low,20,WH-West,Outbound,0,50,Peripherals Co,Yes,45
SKU-103,Keyboard Y,Medium,150,WH-East,None,0,0,Peripherals Co,No,30
SKU-104,Monitor Z,High,300,WH-South,Inbound,50,0,DisplayCorp,No,10
SKU-105,Desk Chair,Low,5,WH-North,Outbound,0,10,OfficeFurn,Yes,120
SKU-101,Laptop Pro,High,600,WH-West,Inbound,100,0,TechSupply Inc,No,5
SKU-106,Webcam A,Medium,100,WH-East,Outbound,0,20,CamTech,No,25
SKU-107,Headset B,Low,15,WH-South,Outbound,0,30,AudioSys,Yes,60
SKU-102,Mouse X,Low,10,WH-North,Outbound,0,10,Peripherals Co,Yes,50
SKU-103,Keyboard Y,Medium,140,WH-West,Outbound,0,10,Peripherals Co,No,35
SKU-108,USB Hub,High,400,WH-East,Inbound,200,0,TechSupply Inc,No,8
SKU-104,Monitor Z,Medium,250,WH-North,Outbound,0,50,DisplayCorp,No,15
SKU-109,Mousepad,High,800,WH-South,None,0,0,OfficeFurn,No,40
SKU-110,Stand,Low,2,WH-East,Outbound,0,5,OfficeFurn,Yes,90
SKU-101,Laptop Pro,Medium,450,WH-North,Outbound,0,50,TechSupply Inc,No,20
`;

const invBroken = `
mã hàng,sp,tồn kho,số lượng,kho,luân chuyển,nhập,xuất,nhà cc,bổ sung,tuổi tồn
SKU-101,Laptop Pro,High,500,WH-East,Inbound,100,0,TechSupply Inc,No,15
SKU-102,,Low,20,,Outbound,0,50,Peripherals Co,Yes,45
SKU-103,Keyboard Y,Medium,150,WH-East,None,0,0,,No,
SKU-104,Monitor Z,High,,WH-South,Inbound,50,0,DisplayCorp,No,10
,Desk Chair,Low,5,WH-North,Outbound,0,10,OfficeFurn,Yes,120
SKU-101,Laptop Pro,High,600,WH-West,Inbound,100,,TechSupply Inc,No,5
SKU-106,Webcam A,,100,WH-East,Outbound,,20,CamTech,No,25
SKU-107,Headset B,Low,15,WH-South,Outbound,0,30,AudioSys,Yes,60
SKU-102,Mouse X,Low,10,,Outbound,0,10,Peripherals Co,Yes,50
SKU-103,,Medium,140,WH-West,Outbound,0,10,Peripherals Co,No,35
SKU-108,USB Hub,High,400,WH-East,Inbound,200,0,,No,8
SKU-104,Monitor Z,Medium,,WH-North,,0,50,DisplayCorp,No,15
SKU-109,Mousepad,High,800,WH-South,None,0,0,OfficeFurn,,40
SKU-110,Stand,Low,2,WH-East,Outbound,0,5,OfficeFurn,Yes,
SKU-101,Laptop Pro,Medium,450,,Outbound,0,50,TechSupply Inc,No,20
`;

writeCsv('inventory', 'good_inventory.csv', invGood);
writeCsv('inventory', 'broken_inventory.csv', invBroken);

// 4. Customer
const cusGood = `
customer_id,segment_tier,lifetime_order_count,total_revenue,retention_status,last_purchase_date,contribution_margin,purchase_behavior_category
CUST-001,Gold,45,12500.00,Active,2023-10-01,35.5,Frequent
CUST-002,Silver,12,3200.00,At Risk,2023-05-15,25.0,Occasional
CUST-003,Bronze,3,450.00,Churned,2022-11-20,15.0,One-off
CUST-004,Platinum,120,45000.00,Active,2023-10-10,40.0,Loyalist
CUST-005,Silver,15,4000.00,Active,2023-09-25,28.0,Occasional
CUST-006,Gold,38,11000.00,At Risk,2023-06-10,32.0,Frequent
CUST-007,Bronze,5,800.00,Active,2023-09-01,18.0,Occasional
CUST-008,Platinum,95,38000.00,Active,2023-10-05,42.0,Loyalist
CUST-009,Silver,10,2500.00,Churned,2022-12-05,22.0,One-off
CUST-010,Gold,50,15000.00,Active,2023-10-08,36.0,Frequent
CUST-011,Bronze,2,300.00,Churned,2022-08-14,10.0,One-off
CUST-012,Silver,18,4800.00,Active,2023-09-30,26.0,Occasional
CUST-013,Platinum,150,60000.00,Active,2023-10-12,45.0,Loyalist
CUST-014,Gold,42,13000.00,At Risk,2023-04-20,34.0,Frequent
CUST-015,Bronze,6,950.00,Active,2023-08-15,19.0,Occasional
`;

const cusBroken = `
khách hàng,phân khúc,số đơn,doanh thu,giữ chân,mua lần cuối,đóng góp,hành vi
CUST-001,Gold,45,12500.00,Active,2023-10-01,35.5,Frequent
CUST-002,,12,3200.00,At Risk,2023-05-15,25.0,Occasional
CUST-003,Bronze,3,450.00,Churned,,15.0,
CUST-004,Platinum,,45000.00,Active,2023-10-10,40.0,Loyalist
,Silver,15,4000.00,Active,2023-09-25,28.0,Occasional
CUST-006,Gold,38,11000.00,,2023-06-10,32.0,Frequent
CUST-007,Bronze,5,800.00,Active,2023-09-01,,Occasional
CUST-008,Platinum,95,,Active,2023-10-05,42.0,Loyalist
CUST-009,Silver,10,2500.00,Churned,2022-12-05,22.0,
CUST-010,,50,15000.00,Active,2023-10-08,36.0,Frequent
CUST-011,Bronze,2,300.00,Churned,,10.0,One-off
CUST-012,Silver,,4800.00,Active,2023-09-30,26.0,Occasional
,Platinum,150,60000.00,Active,2023-10-12,45.0,Loyalist
CUST-014,Gold,42,13000.00,At Risk,2023-04-20,,Frequent
CUST-015,Bronze,6,,Active,2023-08-15,19.0,Occasional
`;

writeCsv('customer', 'good_customer.csv', cusGood);
writeCsv('customer', 'broken_customer.csv', cusBroken);

// 5. Performance
const perfGood = `
kpi_name,target_value,actual_value,achievement_pct,productivity_score,utilization_rate,department_name,efficiency_index,performance_gap_value
Tickets Resolved,100,110,110,85,90,Support,1.2,-10
Sales Calls,50,45,90,70,80,Sales,0.9,5
Features Shipped,10,8,80,75,95,Engineering,0.8,2
Marketing Leads,500,600,120,90,85,Marketing,1.3,-100
Tickets Resolved,100,95,95,80,88,Support,0.95,5
Sales Calls,50,55,110,85,90,Sales,1.1,-5
Features Shipped,10,12,120,95,98,Engineering,1.2,-2
Marketing Leads,500,450,90,75,80,Marketing,0.85,50
Tickets Resolved,100,105,105,82,89,Support,1.05,-5
Sales Calls,50,50,100,80,85,Sales,1.0,0
Features Shipped,10,9,90,80,92,Engineering,0.9,1
Marketing Leads,500,520,104,85,88,Marketing,1.1,-20
Tickets Resolved,100,80,80,60,70,Support,0.7,20
Sales Calls,50,40,80,65,75,Sales,0.8,10
Features Shipped,10,10,100,85,90,Engineering,1.0,0
`;

const perfBroken = `
chỉ số,mục tiêu,thực tế,đạt được,năng suất,sử dụng,phòng ban,hiệu quả,chênh lệch
Tickets Resolved,100,110,110,85,90,Support,1.2,-10
Sales Calls,50,45,90,,80,Sales,0.9,5
Features Shipped,,8,80,75,95,,0.8,2
Marketing Leads,500,600,120,90,85,Marketing,1.3,-100
Tickets Resolved,100,95,,80,88,Support,0.95,5
Sales Calls,50,55,110,85,,Sales,1.1,-5
,10,12,120,95,98,Engineering,1.2,-2
Marketing Leads,500,,90,75,80,Marketing,0.85,50
Tickets Resolved,100,105,105,82,89,Support,1.05,-5
Sales Calls,,50,100,80,85,Sales,1.0,0
Features Shipped,10,9,90,80,92,,0.9,1
Marketing Leads,500,520,,85,88,Marketing,1.1,-20
Tickets Resolved,100,80,80,60,70,Support,,20
Sales Calls,50,40,80,65,75,Sales,0.8,
,10,10,100,85,90,Engineering,1.0,0
`;

writeCsv('performance', 'good_performance.csv', perfGood);
writeCsv('performance', 'broken_performance.csv', perfBroken);

// 6. Finance
const finGood = `
period,revenue_total,cost_total,profit_net,margin_pct,expense_misc,discount_amt,purchase_cost_amt,operational_cost_amt,supplier_cost_amt
2023-Q1,150000,100000,50000,33.3,5000,2000,60000,35000,20000
2023-Q2,160000,105000,55000,34.3,5200,2500,62000,37800,21000
2023-Q3,140000,98000,42000,30.0,4800,1500,58000,35200,19000
2023-Q4,180000,115000,65000,36.1,6000,3000,70000,39000,23000
2022-Q1,130000,90000,40000,30.7,4500,1000,55000,30500,18000
2022-Q2,135000,92000,43000,31.8,4600,1200,56000,31400,18500
2022-Q3,145000,96000,49000,33.7,4900,1800,59000,32100,19500
2022-Q4,155000,102000,53000,34.1,5100,2200,61000,35900,20500
2021-Q1,120000,85000,35000,29.1,4000,800,50000,31000,16000
2021-Q2,125000,87000,38000,30.4,4200,900,52000,30800,16500
2021-Q3,128000,89000,39000,30.4,4300,1100,53000,31700,17000
2021-Q4,138000,94000,44000,31.8,4700,1400,57000,32300,18500
2020-Q1,110000,80000,30000,27.2,3800,500,48000,28200,15000
2020-Q2,115000,82000,33000,28.6,3900,600,49000,29100,15500
2020-Q3,118000,84000,34000,28.8,4100,700,50000,29900,16000
`;

const finBroken = `
kỳ,doanh thu,chi phí,lợi nhuận,biên LN,chi tiêu,chiết khấu,giá mua,cp hoạt động,cp ncc
2023-Q1,150000,100000,50000,33.3,5000,2000,60000,35000,20000
2023-Q2,,105000,55000,34.3,5200,2500,62000,37800,21000
2023-Q3,140000,98000,42000,,4800,1500,58000,,19000
2023-Q4,180000,,65000,36.1,6000,3000,70000,39000,23000
2022-Q1,130000,90000,,30.7,4500,,55000,30500,18000
,135000,92000,43000,31.8,,1200,56000,31400,18500
2022-Q3,145000,96000,49000,33.7,4900,1800,,32100,19500
2022-Q4,155000,102000,53000,,5100,2200,61000,,20500
2021-Q1,,85000,35000,29.1,4000,800,50000,31000,16000
2021-Q2,125000,,38000,30.4,4200,900,52000,30800,16500
2021-Q3,128000,89000,39000,30.4,4300,,53000,31700,
2021-Q4,138000,94000,,31.8,4700,1400,57000,32300,18500
,110000,80000,30000,27.2,3800,500,,28200,15000
2020-Q2,115000,82000,33000,,3900,600,49000,29100,15500
2020-Q3,118000,84000,34000,28.8,,700,50000,,16000
`;

writeCsv('finance', 'good_finance.csv', finGood);
writeCsv('finance', 'broken_finance.csv', finBroken);
