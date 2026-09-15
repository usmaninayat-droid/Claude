const assetPathPrefix = "https://www.figma.com/api/mcp/asset/4fa350b0-bfb9-4fce-aa49-8cb8a6bcc7ad";
const imgCheck = `${assetPathPrefix}/78e0d.svg`;
const imgSearchRefraction = `${assetPathPrefix}/f1fcd.svg`;
const imgGroup = `${assetPathPrefix}/3ff6b.svg`;
const imgGroup1261153435 = `${assetPathPrefix}/ca01b.svg`;
const imgVector429 = `${assetPathPrefix}/ab75b.svg`;
const imgVector = `${assetPathPrefix}/df586.svg`;
const imgVector1 = `${assetPathPrefix}/49e87.svg`;
const imgVector2 = `${assetPathPrefix}/ff3ae.svg`;
const imgVector3 = `${assetPathPrefix}/87d1b.svg`;
const imgVector4 = `${assetPathPrefix}/84a2b.svg`;
const imgVector5 = `${assetPathPrefix}/dedfc.svg`;
const imgVector6 = `${assetPathPrefix}/8838a.svg`;
const imgVector7 = `${assetPathPrefix}/b5708.svg`;
const imgVector8 = `${assetPathPrefix}/b859e.svg`;
const imgVector9 = `${assetPathPrefix}/a0e6b.svg`;
const imgVector10 = `${assetPathPrefix}/59657.svg`;
const imgGroup1 = `${assetPathPrefix}/d067c.svg`;
const imgGroup2 = `${assetPathPrefix}/be0cf.svg`;
const imgVector11 = `${assetPathPrefix}/e3658.svg`;
const imgVector12 = `${assetPathPrefix}/33181.svg`;
const imgVector13 = `${assetPathPrefix}/7ea11.svg`;
const imgVector14 = `${assetPathPrefix}/c6bbe.svg`;
const imgVector15 = `${assetPathPrefix}/9a0a4.svg`;
const imgVector16 = `${assetPathPrefix}/7601a.svg`;
const imgVector17 = `${assetPathPrefix}/d8ed3.svg`;
const imgGroup3 = `${assetPathPrefix}/c04ab.svg`;
const imgVector18 = `${assetPathPrefix}/539ae.svg`;
const imgVector19 = `${assetPathPrefix}/04796.svg`;
const imgVector20 = `${assetPathPrefix}/952e9.svg`;
const imgVector21 = `${assetPathPrefix}/cea24.svg`;
const imgVector22 = `${assetPathPrefix}/bb70f.svg`;
const imgGroup4 = `${assetPathPrefix}/af472.svg`;
const imgVector23 = `${assetPathPrefix}/ed973.svg`;
const imgGroup5 = `${assetPathPrefix}/b6120.svg`;
const imgVector24 = `${assetPathPrefix}/f83a3.svg`;
const imgVector25 = `${assetPathPrefix}/e6954.svg`;
const imgVector26 = `${assetPathPrefix}/9700b.svg`;
const imgVector27 = `${assetPathPrefix}/f73d1.svg`;
const imgVector28 = `${assetPathPrefix}/2c960.svg`;
const imgVector29 = `${assetPathPrefix}/d415b.svg`;
const imgVector30 = `${assetPathPrefix}/4bbf4.svg`;
const imgVector31 = `${assetPathPrefix}/e503f.svg`;
const imgVector32 = `${assetPathPrefix}/689ff.svg`;
const imgVector33 = `${assetPathPrefix}/065e1.svg`;
const imgVector34 = `${assetPathPrefix}/4ba5b.svg`;
const imgVector35 = `${assetPathPrefix}/5a545.svg`;
const imgVector36 = `${assetPathPrefix}/ba427.svg`;
const imgGroup6 = `${assetPathPrefix}/dd079.svg`;
const imgVector37 = `${assetPathPrefix}/9b336.svg`;
const imgVector38 = `${assetPathPrefix}/fc111.svg`;
const imgVector39 = `${assetPathPrefix}/bd9d2.svg`;
const imgVector40 = `${assetPathPrefix}/5d20e.svg`;
const imgVector41 = `${assetPathPrefix}/9bee8.svg`;
const imgVector42 = `${assetPathPrefix}/30f38.svg`;
const imgVector43 = `${assetPathPrefix}/7ef35.svg`;
const imgVector44 = `${assetPathPrefix}/3d384.svg`;
const imgVector45 = `${assetPathPrefix}/dd855.svg`;
const imgVector46 = `${assetPathPrefix}/b7d58.svg`;
const imgVector47 = `${assetPathPrefix}/b851d.svg`;
const imgVector48 = `${assetPathPrefix}/00ca7.svg`;
const imgVector49 = `${assetPathPrefix}/f40f8.svg`;
const imgVector50 = `${assetPathPrefix}/4c367.svg`;
const imgVector51 = `${assetPathPrefix}/735ec.svg`;
const imgVector52 = `${assetPathPrefix}/47f79.svg`;
const imgVector53 = `${assetPathPrefix}/2fc0f.svg`;
const imgVector54 = `${assetPathPrefix}/feb61.svg`;
const imgGroup7 = `${assetPathPrefix}/e64cb.svg`;
const imgGroup8 = `${assetPathPrefix}/c0daf.svg`;
const imgGroup9 = `${assetPathPrefix}/e0cd4.svg`;
const imgGroup10 = `${assetPathPrefix}/d627d.svg`;
const imgGroup11 = `${assetPathPrefix}/8c53c.svg`;
const imgGroup12 = `${assetPathPrefix}/9a239.svg`;
const imgVector55 = `${assetPathPrefix}/750ef.svg`;
const imgVector56 = `${assetPathPrefix}/a86b5.svg`;
const imgVector57 = `${assetPathPrefix}/e053e.svg`;
const imgGroup13 = `${assetPathPrefix}/a7ce0.svg`;
const imgVector58 = `${assetPathPrefix}/1012a.svg`;
const imgVector59 = `${assetPathPrefix}/5e112.svg`;
const imgGroup14 = `${assetPathPrefix}/a9e2a.svg`;
const imgVector60 = `${assetPathPrefix}/4b186.svg`;
const imgVector61 = `${assetPathPrefix}/5dbd5.svg`;
const imgGroup1261153432 = `${assetPathPrefix}/321a2.svg`;
const imgVector62 = `${assetPathPrefix}/c99bb.svg`;
const imgVector63 = `${assetPathPrefix}/a42ca.svg`;
const imgVector64 = `${assetPathPrefix}/a4067.svg`;
const imgVector65 = `${assetPathPrefix}/b9619.svg`;
const imgVector66 = `${assetPathPrefix}/cb946.svg`;
const imgRecoveryTruck = `${assetPathPrefix}/4b86f.svg`;
const imgGroup15 = `${assetPathPrefix}/37911.svg`;
const imgGroup16 = `${assetPathPrefix}/d2697.svg`;
const imgGroup17 = `${assetPathPrefix}/f8a75.svg`;
const imgGroup1261153433 = `${assetPathPrefix}/edf51.svg`;

type CheckBoxProps = {
  className?: string;
  property1?: "Check" | "Not checked";
};

function CheckBox({ className, property1 = "Check" }: CheckBoxProps) {
  const isNotChecked = property1 === "Not checked";
  return (
    <div className={className || "content-stretch flex gap-[10px] items-center justify-center relative"} id={isNotChecked ? "node-2052_227" : "node-2052_224"}>
      {property1 === "Check" && <div className="bg-[#0072d6] relative rounded-[2px] shrink-0 size-[16px]" data-node-id="2052:225" />}
      <div className="absolute left-[2px] size-[12px] top-[2px]" id={isNotChecked ? "node-2052_228" : "node-2052_226"} data-name="check">
        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCheck} />
      </div>
      {isNotChecked && <div className="bg-white border border-[#d0d5dd] border-solid relative rounded-[2px] shrink-0 size-[16px]" data-node-id="2052:229" />}
    </div>
  );
}

export default function Dropdown() {
  return (
    <div className="border border-[#d0d5dd] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[6px] shadow-[0px_0px_15px_0px_rgba(0,0,0,0.08)] size-full" data-node-id="2111:2451" data-name="dropdown">
      <div className="bg-white content-stretch flex flex-col items-start overflow-clip p-[16px] relative shadow-[0px_17px_24px_-4px_rgba(16,24,40,0.08),0px_5px_8px_-4px_rgba(16,24,40,0.03)] shrink-0 w-full" data-node-id="2111:2452" data-name="popup">
        <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-node-id="2111:2453">
          <div className="content-stretch flex items-center relative shrink-0 w-full" data-node-id="2111:2454">
            <p className="[word-break:break-word] font-['Gilroy:SemiBold'] leading-[normal] not-italic relative shrink-0 text-[#344054] text-[12px] whitespace-nowrap" data-node-id="2111:2455">
              Select Assets
            </p>
          </div>
          <div className="content-stretch flex flex-col gap-[10px] h-[40px] items-center justify-center relative shrink-0 w-full" data-node-id="2111:2456">
            <div className="border border-[#d0d5dd] border-solid h-[40px] relative rounded-[4px] shrink-0 w-full" data-node-id="2111:2457" />
            <div className="-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[8px] top-1/2" data-node-id="2111:2458">
              <div className="relative shrink-0 size-[16px]" data-node-id="2111:2459" data-name="search-refraction">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSearchRefraction} />
              </div>
              <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[#98a2b3] text-[12px] whitespace-nowrap" data-node-id="2111:2460">
                Search anything here
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start overflow-clip pt-[16px] relative rounded-bl-[6px] rounded-br-[6px] shrink-0 w-full" data-node-id="2111:2461">
          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="2111:2462">
            <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[12px] w-full whitespace-nowrap" data-node-id="2111:2463">
              <p className="font-['Gilroy:SemiBold'] overflow-hidden relative shrink-0 text-[#98a2b3] text-ellipsis" data-node-id="2111:2464">
                Selected Assets
              </p>
              <p className="font-['Gilroy:Medium'] overflow-hidden relative shrink-0 text-[color:var(--base\/base-dark,black)] text-ellipsis text-right" data-node-id="2111:2465">
                Select All
              </p>
            </div>
            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="2111:2466">
              <div className="border-[#eaecf0] border-b border-solid content-stretch flex items-center p-[12px] relative shrink-0 w-full" data-node-id="2111:2467">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2468">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-node-id="2111:2469" data-name="Check Box">
                      <div className="bg-[var(--primary\/primary,#0072d6)] relative rounded-[2px] shrink-0 size-[16px]" data-node-id="I2111:2469;533:10081" />
                      <div className="absolute left-[2px] size-[12px] top-[2px]" data-node-id="I2111:2469;533:10082" data-name="check">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCheck} />
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="2111:2470">
                      <div className="h-[16px] overflow-clip relative shrink-0 w-[30.087px]" data-node-id="2111:2471" data-name="new Compactor">
                        <div className="absolute inset-[6.52%_0.21%_0_0]" data-node-id="2111:2472" data-name="Compactor">
                          <div className="absolute contents inset-[17.05%_0_0_21.14%]" data-node-id="I2111:2472;1570:71573" data-name="Truck">
                            <div className="absolute contents inset-[17.05%_0_0_21.14%]" data-node-id="I2111:2472;1570:71575" style={{ containerType: "size" }} data-name="Layer 1">
                              <div className="absolute flex inset-[17.05%_0_0_21.14%] items-center justify-center" data-node-id="I2111:2472;1570:71576" style={{ containerType: "size" }}>
                                <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                                  <div className="relative size-full" data-name="Group">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute flex inset-[0_24.42%_17.86%_0] items-center justify-center" data-node-id="I2111:2472;1570:71794" style={{ containerType: "size" }}>
                            <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                              <div className="relative size-full">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1261153435} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-[10.5%_26.43%_34.64%_17.75%]" data-node-id="2111:2473">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector429} />
                        </div>
                        <div className="absolute inset-[18.48%_42.52%_42.39%_38.14%]" data-node-id="2111:2474" data-name="Vector">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] whitespace-nowrap" data-node-id="2111:2475">
                        Compactor
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-[#eaecf0] border-b border-solid content-stretch flex items-center px-[12px] py-[10px] relative shrink-0 w-full" data-node-id="2111:2476">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2477">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <CheckBox className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" property1="Not checked" />
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="2111:2479">
                      <div className="h-[16px] overflow-clip relative shrink-0 w-[29.565px]" data-node-id="2111:2480" data-name="Skip Loader">
                        <div className="absolute contents inset-[14.14%_0_0.11%_0]" data-node-id="2111:2481">
                          <div className="absolute inset-[66.87%_21.59%_18.58%_58.13%]" data-node-id="2111:2482" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector1} />
                          </div>
                          <div className="absolute inset-[71.07%_32.13%_12.4%_0.72%]" data-node-id="2111:2483" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector2} />
                          </div>
                          <div className="absolute inset-[68.6%_48.1%_16.2%_44.27%] mix-blend-multiply" data-node-id="2111:2484" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector3} />
                          </div>
                          <div className="absolute inset-[69.63%_48.37%_16.97%_44.67%]" data-node-id="2111:2485" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector4} />
                          </div>
                          <div className="absolute inset-[70.68%_32.55%_12.79%_50.93%]" data-node-id="2111:2486" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector5} />
                          </div>
                          <div className="absolute inset-[70.68%_32.55%_12.74%_50.93%] mix-blend-multiply" data-node-id="2111:2487" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector6} />
                          </div>
                          <div className="absolute inset-[69.8%_99.36%_13.52%_0]" data-node-id="2111:2488" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector7} />
                          </div>
                          <div className="absolute inset-[69.73%_99.68%_13.89%_0]" data-node-id="2111:2489" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector8} />
                          </div>
                          <div className="absolute inset-[69.9%_78.66%_11.88%_3.12%]" data-node-id="2111:2490" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector9} />
                          </div>
                          <div className="absolute inset-[72.22%_79.85%_11.94%_4.3%]" data-node-id="2111:2491" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector10} />
                          </div>
                          <div className="absolute inset-[74.37%_80.79%_0.11%_5.4%]" data-node-id="2111:2492" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1} />
                          </div>
                          <div className="absolute inset-[66.02%_32.52%_27.66%_0.03%]" data-node-id="2111:2495" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup2} />
                          </div>
                          <div className="absolute inset-[72.34%_32.87%_27.66%_0.03%] mix-blend-multiply" data-node-id="2111:2501" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector11} />
                          </div>
                          <div className="absolute inset-[72.17%_32.91%_23.86%_64.95%] mix-blend-multiply" data-node-id="2111:2502" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector12} />
                          </div>
                          <div className="absolute inset-[72.12%_35.12%_23.91%_62.73%] mix-blend-multiply" data-node-id="2111:2503" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector13} />
                          </div>
                          <div className="absolute inset-[72.46%_35.28%_24.26%_62.92%]" data-node-id="2111:2504" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector14} />
                          </div>
                          <div className="absolute inset-[72.46%_33.06%_24.21%_65.14%]" data-node-id="2111:2505" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector15} />
                          </div>
                          <div className="absolute contents inset-[27.1%_0_0.11%_67.48%]" data-node-id="2111:2506" data-name="Group">
                            <div className="absolute contents inset-[27.1%_2.61%_0.11%_67.48%]" data-node-id="2111:2507" data-name="Group">
                              <div className="absolute inset-[72.88%_17.2%_16%_68.82%]" data-node-id="2111:2508" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector16} />
                              </div>
                              <div className="absolute inset-[71.88%_14.92%_13.08%_67.48%]" data-node-id="2111:2509" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector17} />
                              </div>
                              <div className="absolute inset-[74.37%_17.34%_0.11%_68.85%]" data-node-id="2111:2510" data-name="Group">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup3} />
                              </div>
                              <div className="absolute inset-[27.1%_13.31%_66.99%_68.31%]" data-node-id="2111:2513" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector18} />
                              </div>
                              <div className="absolute inset-[31.57%_29.13%_26.73%_68.31%]" data-node-id="2111:2514" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector19} />
                              </div>
                              <div className="absolute inset-[31.57%_3.17%_9.35%_69.77%]" data-node-id="2111:2515" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector20} />
                              </div>
                              <div className="absolute inset-[27.1%_13.31%_66.99%_68.31%]" data-node-id="2111:2516" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector21} />
                              </div>
                              <div className="absolute inset-[31.57%_29.13%_26.73%_68.31%]" data-node-id="2111:2517" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector22} />
                              </div>
                              <div className="absolute contents inset-[32.91%_3.44%_33.03%_70.22%]" data-node-id="2111:2518" data-name="Group">
                                <div className="absolute inset-[32.91%_3.44%_33.03%_70.22%]" data-node-id="2111:2519" data-name="Group">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup4} />
                                </div>
                                <div className="absolute contents inset-[56.88%_25.62%_40.53%_70.98%]" data-node-id="2111:2523" data-name="Group">
                                  <div className="absolute inset-[56.98%_25.73%_40.63%_71.16%]" data-node-id="2111:2524" data-name="Vector">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector23} />
                                  </div>
                                  <div className="absolute inset-[58.18%_26.18%_40.58%_71.41%] mix-blend-multiply" data-node-id="2111:2525" data-name="Group">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup5} />
                                  </div>
                                  <div className="absolute inset-[56.88%_25.62%_40.53%_70.98%] mix-blend-multiply" data-node-id="2111:2527" data-name="Vector">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector24} />
                                  </div>
                                </div>
                              </div>
                              <div className="absolute inset-[31.57%_30.31%_26.73%_68.29%] mix-blend-multiply" data-node-id="2111:2528" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector25} />
                              </div>
                              <div className="absolute inset-[27.44%_13.31%_67%_68.31%] mix-blend-multiply" data-node-id="2111:2529" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector26} />
                              </div>
                              <div className="absolute inset-[71.88%_14.89%_8.76%_67.48%]" data-node-id="2111:2530" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector27} />
                              </div>
                              <div className="absolute inset-[73.02%_3.23%_9.3%_79.44%] mix-blend-multiply" data-node-id="2111:2531" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector28} />
                              </div>
                              <div className="absolute inset-[81.81%_2.61%_6.32%_85.97%]" data-node-id="2111:2532" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector29} />
                              </div>
                              <div className="absolute inset-[87.77%_2.67%_6.32%_85.93%] mix-blend-multiply" data-node-id="2111:2533" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector30} />
                              </div>
                            </div>
                            <div className="absolute inset-[69.8%_3.82%_27.52%_95.21%] mix-blend-multiply" data-node-id="2111:2534" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector31} />
                            </div>
                            <div className="absolute contents inset-[49.1%_0.81%_34.67%_97.31%]" data-node-id="2111:2535" data-name="Group">
                              <div className="absolute inset-[49.2%_0.81%_34.67%_97.31%]" data-node-id="2111:2536" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector32} />
                              </div>
                              <div className="absolute inset-[49.1%_1.08%_34.77%_97.31%] mix-blend-multiply" data-node-id="2111:2537" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector33} />
                              </div>
                              <div className="absolute inset-[49.15%_0.84%_34.67%_97.31%] mix-blend-multiply" data-node-id="2111:2538" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector34} />
                              </div>
                            </div>
                            <div className="absolute contents inset-[70%_3.85%_27.82%_95.4%]" data-node-id="2111:2539" data-name="Group">
                              <div className="absolute inset-[70%_3.85%_27.82%_95.4%] mix-blend-multiply" data-node-id="2111:2540" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector35} />
                              </div>
                              <div className="absolute inset-[70.04%_3.88%_27.87%_95.43%]" data-node-id="2111:2541" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector36} />
                              </div>
                              <div className="absolute inset-[71.09%_3.88%_27.86%_95.43%] mix-blend-multiply" data-node-id="2111:2542" data-name="Group">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup6} />
                              </div>
                            </div>
                            <div className="absolute inset-[70.41%_3.93%_28.3%_95.58%] mix-blend-multiply" data-node-id="2111:2544" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector37} />
                            </div>
                            <div className="absolute inset-[57.74%_1.17%_40.97%_98.35%] mix-blend-multiply" data-node-id="2111:2545" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector37} />
                            </div>
                            <div className="absolute inset-[57.94%_0_28.46%_95.61%]" data-node-id="2111:2546" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector38} />
                            </div>
                            <div className="absolute inset-[70.41%_1.05%_29.34%_95.75%] mix-blend-multiply" data-node-id="2111:2547" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector39} />
                            </div>
                          </div>
                          <div className="absolute contents inset-[23.51%_65.63%_56.73%_25.77%]" data-node-id="2111:2548" data-name="Group">
                            <div className="absolute inset-[23.51%_65.66%_56.73%_25.77%]" data-node-id="2111:2549" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector40} />
                            </div>
                            <div className="absolute inset-[23.85%_65.85%_58.52%_25.9%] mix-blend-screen" data-node-id="2111:2550" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector41} />
                            </div>
                            <div className="absolute inset-[25.34%_65.65%_56.73%_26.37%]" data-node-id="2111:2551" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector42} />
                            </div>
                            <div className="absolute inset-[23.51%_65.63%_70.28%_32.3%] mix-blend-multiply" data-node-id="2111:2552" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector43} />
                            </div>
                            <div className="absolute inset-[38.75%_72.11%_56.74%_25.77%] mix-blend-multiply" data-node-id="2111:2553" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector44} />
                            </div>
                          </div>
                          <div className="absolute inset-[19.95%_63.16%_66.84%_31.77%]" data-node-id="2111:2554" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector45} />
                          </div>
                          <div className="absolute inset-[24.95%_63.14%_66.81%_33.68%] mix-blend-multiply" data-node-id="2111:2555" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector46} />
                          </div>
                          <div className="absolute inset-[19.31%_59.67%_45.24%_25.77%]" data-node-id="2111:2556" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector47} />
                          </div>
                          <div className="absolute inset-[45.07%_70.68%_45.25%_25.77%] mix-blend-multiply" data-node-id="2111:2557" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector48} />
                          </div>
                          <div className="absolute inset-[21.68%_59.88%_45.8%_26.5%] mix-blend-multiply" data-node-id="2111:2558" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector49} />
                          </div>
                          <div className="absolute inset-[20.8%_60.85%_48.27%_25.77%] mix-blend-screen" data-node-id="2111:2559" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector50} />
                          </div>
                          <div className="absolute inset-[19.26%_59.66%_74.13%_37.87%] mix-blend-multiply" data-node-id="2111:2560" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector51} />
                          </div>
                          <div className="absolute inset-[34.5%_71.65%_34.22%_8.14%]" data-node-id="2111:2561" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector52} />
                          </div>
                          <div className="absolute inset-[37.74%_72.33%_52.74%_23.7%]" data-node-id="2111:2562" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector53} />
                          </div>
                          <div className="absolute inset-[38.06%_72.76%_52.75%_23.72%]" data-node-id="2111:2563" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector54} />
                          </div>
                          <div className="absolute inset-[34.5%_71.68%_34.17%_8.13%]" data-node-id="2111:2564" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup7} />
                          </div>
                          <div className="absolute inset-[25.2%_65.53%_73.02%_33.5%]" data-node-id="2111:2567" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup8} />
                          </div>
                          <div className="absolute inset-[41.11%_73.16%_57.1%_25.88%]" data-node-id="2111:2570" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup9} />
                          </div>
                          <div className="absolute inset-[49.1%_71.2%_49.81%_28.21%]" data-node-id="2111:2573" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup10} />
                          </div>
                          <div className="absolute inset-[46.46%_72.03%_52.45%_27.38%]" data-node-id="2111:2576" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup11} />
                          </div>
                          <div className="absolute inset-[25.1%_60.58%_73.81%_38.82%]" data-node-id="2111:2579" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup12} />
                          </div>
                          <div className="absolute inset-[42.72%_73.05%_36.42%_12.66%]" data-node-id="2111:2582" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector55} />
                          </div>
                          <div className="absolute inset-[21.14%_66.01%_70.62%_31.94%] mix-blend-multiply" data-node-id="2111:2583" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector56} />
                          </div>
                          <div className="absolute inset-[14.14%_58.47%_72.65%_36.46%]" data-node-id="2111:2584" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector57} />
                          </div>
                          <div className="absolute inset-[19.41%_60.88%_78.8%_38.15%]" data-node-id="2111:2585" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup13} />
                          </div>
                          <div className="absolute inset-[15.28%_61.1%_75.58%_36.61%] mix-blend-multiply" data-node-id="2111:2588" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector58} />
                          </div>
                          <div className="absolute inset-[69.58%_6.46%_15.2%_85.89%]" data-node-id="2111:2589" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector59} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] whitespace-nowrap" data-node-id="2111:2590">
                        Skip Loader
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-[#eaecf0] border-b border-solid content-stretch flex items-center px-[12px] py-[10px] relative shrink-0 w-full" data-node-id="2111:2591">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2592">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <CheckBox className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" property1="Not checked" />
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="2111:2594">
                      <div className="h-[16px] overflow-clip relative shrink-0 w-[33.488px]" data-node-id="2111:2595" data-name="Hook Loader">
                        <div className="absolute h-[16px] left-0 top-[-0.37px] w-[33.488px]" data-node-id="2111:2596" />
                        <div className="absolute h-[16.744px] left-[1.86px] top-[-0.74px] w-[29.758px]" data-node-id="2111:2597" data-name="Crane">
                          <div className="absolute flex inset-[0_0.01%_0_-0.01%] items-center justify-center" data-node-id="2111:2598" style={{ containerType: "size" }}>
                            <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                              <div className="relative size-full" data-name="Crane">
                                <div className="absolute contents inset-[21.11%_0_-0.23%_15.04%]" data-node-id="2111:2599" data-name="Layer 1">
                                  <div className="absolute inset-[21.11%_0_-0.23%_15.04%]" data-node-id="2111:2600" data-name="Group">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup14} />
                                  </div>
                                </div>
                                <div className="absolute inset-[8.4%_23.51%_31.6%_52.65%]" data-node-id="2111:2622" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector60} />
                                </div>
                                <div className="absolute inset-[5.83%_1.21%_82.75%_28.92%]" data-node-id="2111:2623" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector61} />
                                </div>
                                <div className="absolute inset-[2.27%_71.07%_17.94%_-2.84%]" data-node-id="2111:2624">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1261153432} />
                                </div>
                                <div className="absolute inset-[44.44%_0_34.68%_80.94%]" data-node-id="2111:2630" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector62} />
                                </div>
                                <div className="absolute inset-[39.68%_18.54%_33.28%_67.41%]" data-node-id="2111:2631" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector63} />
                                </div>
                                <div className="absolute inset-[66.72%_20.72%_31.78%_69.72%]" data-node-id="2111:2632" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector64} />
                                </div>
                                <div className="absolute flex inset-[6.93%_0.01%_55.44%_89.9%] items-center justify-center" data-node-id="2111:2633" style={{ containerType: "size" }}>
                                  <div className="-rotate-90 flex-none h-[100cqw] w-[100cqh]">
                                    <div className="relative size-full" data-name="Vector">
                                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector65} />
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute flex inset-[18.31%_-7.53%_32.18%_79.67%] items-center justify-center" data-node-id="2111:2634" style={{ containerType: "size" }}>
                                  <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                                    <div className="relative size-full" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-[44.19%_68.33%_39.53%_24.45%]" data-node-id="2111:2635" data-name="Vector">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector66} />
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] whitespace-nowrap" data-node-id="2111:2636">
                        Hook Loader
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-[#eaecf0] border-b border-solid content-stretch flex items-center px-[12px] py-[10px] relative shrink-0 w-full" data-node-id="2111:2637">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2638">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <CheckBox className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" property1="Not checked" />
                    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="2111:2640">
                      <div className="h-[16px] relative shrink-0 w-[33.043px]" data-node-id="2111:2641">
                        <div className="absolute contents left-0 top-0" data-node-id="2111:2642" data-name="Recovery Truck">
                          <div className="absolute h-[16px] left-0 top-0 w-[33.488px]" data-node-id="2111:2643" />
                          <div className="absolute h-[16px] left-[1.12px] top-0 w-[31.135px]" data-node-id="2111:2644" data-name="Recovery Truck">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgRecoveryTruck} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] h-[15px] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] w-[62px]" data-node-id="2111:2696">
                        Loader
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-[#eaecf0] border-b border-solid content-stretch flex items-center px-[12px] py-[10px] relative shrink-0 w-full" data-node-id="2111:2697">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2698">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <CheckBox className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" property1="Not checked" />
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="2111:2700">
                      <div className="h-[16px] overflow-clip relative shrink-0 w-[29.565px]" data-node-id="2111:2701" data-name="Skip Loader">
                        <div className="absolute contents inset-[14.14%_0_0.11%_0]" data-node-id="2111:2702">
                          <div className="absolute inset-[66.85%_21.59%_18.61%_58.13%]" data-node-id="2111:2703" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector1} />
                          </div>
                          <div className="absolute inset-[71.07%_32.13%_12.4%_0.72%]" data-node-id="2111:2704" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector2} />
                          </div>
                          <div className="absolute inset-[68.6%_48.1%_16.2%_44.27%] mix-blend-multiply" data-node-id="2111:2705" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector3} />
                          </div>
                          <div className="absolute inset-[69.63%_48.37%_16.97%_44.67%]" data-node-id="2111:2706" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector4} />
                          </div>
                          <div className="absolute inset-[70.7%_32.55%_12.76%_50.93%]" data-node-id="2111:2707" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector5} />
                          </div>
                          <div className="absolute inset-[70.7%_32.55%_12.71%_50.93%] mix-blend-multiply" data-node-id="2111:2708" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector6} />
                          </div>
                          <div className="absolute inset-[69.8%_99.36%_13.52%_0]" data-node-id="2111:2709" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector7} />
                          </div>
                          <div className="absolute inset-[69.73%_99.68%_13.89%_0]" data-node-id="2111:2710" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector8} />
                          </div>
                          <div className="absolute inset-[69.87%_78.66%_11.91%_3.12%]" data-node-id="2111:2711" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector9} />
                          </div>
                          <div className="absolute inset-[72.22%_79.85%_11.94%_4.3%]" data-node-id="2111:2712" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector10} />
                          </div>
                          <div className="absolute inset-[74.37%_80.79%_0.11%_5.4%]" data-node-id="2111:2713" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1} />
                          </div>
                          <div className="absolute inset-[66.02%_32.52%_27.66%_0.03%]" data-node-id="2111:2716" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup2} />
                          </div>
                          <div className="absolute inset-[72.34%_32.87%_27.66%_0.03%] mix-blend-multiply" data-node-id="2111:2722" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector11} />
                          </div>
                          <div className="absolute inset-[72.17%_32.91%_23.86%_64.95%] mix-blend-multiply" data-node-id="2111:2723" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector12} />
                          </div>
                          <div className="absolute inset-[72.12%_35.12%_23.91%_62.73%] mix-blend-multiply" data-node-id="2111:2724" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector13} />
                          </div>
                          <div className="absolute inset-[72.46%_35.28%_24.26%_62.92%]" data-node-id="2111:2725" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector14} />
                          </div>
                          <div className="absolute inset-[72.46%_33.06%_24.21%_65.14%]" data-node-id="2111:2726" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector15} />
                          </div>
                          <div className="absolute contents inset-[27.1%_0_0.11%_67.48%]" data-node-id="2111:2727" data-name="Group">
                            <div className="absolute contents inset-[27.1%_2.61%_0.11%_67.48%]" data-node-id="2111:2728" data-name="Group">
                              <div className="absolute inset-[72.88%_17.2%_16%_68.82%]" data-node-id="2111:2729" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector16} />
                              </div>
                              <div className="absolute inset-[71.88%_14.92%_13.08%_67.48%]" data-node-id="2111:2730" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector17} />
                              </div>
                              <div className="absolute inset-[74.37%_17.34%_0.11%_68.85%]" data-node-id="2111:2731" data-name="Group">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup3} />
                              </div>
                              <div className="absolute inset-[27.1%_13.31%_66.99%_68.31%]" data-node-id="2111:2734" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector18} />
                              </div>
                              <div className="absolute inset-[31.57%_29.13%_26.73%_68.31%]" data-node-id="2111:2735" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector19} />
                              </div>
                              <div className="absolute inset-[31.57%_3.17%_9.35%_69.77%]" data-node-id="2111:2736" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector20} />
                              </div>
                              <div className="absolute inset-[27.1%_13.31%_66.99%_68.31%]" data-node-id="2111:2737" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector21} />
                              </div>
                              <div className="absolute inset-[31.57%_29.13%_26.73%_68.31%]" data-node-id="2111:2738" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector22} />
                              </div>
                              <div className="absolute contents inset-[32.91%_3.44%_33.03%_70.22%]" data-node-id="2111:2739" data-name="Group">
                                <div className="absolute inset-[32.91%_3.44%_33.03%_70.22%]" data-node-id="2111:2740" data-name="Group">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup4} />
                                </div>
                                <div className="absolute contents inset-[56.88%_25.62%_40.53%_70.98%]" data-node-id="2111:2744" data-name="Group">
                                  <div className="absolute inset-[56.98%_25.73%_40.63%_71.16%]" data-node-id="2111:2745" data-name="Vector">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector23} />
                                  </div>
                                  <div className="absolute inset-[58.18%_26.18%_40.58%_71.41%] mix-blend-multiply" data-node-id="2111:2746" data-name="Group">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup5} />
                                  </div>
                                  <div className="absolute inset-[56.88%_25.62%_40.53%_70.98%] mix-blend-multiply" data-node-id="2111:2748" data-name="Vector">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector24} />
                                  </div>
                                </div>
                              </div>
                              <div className="absolute inset-[31.57%_30.31%_26.73%_68.29%] mix-blend-multiply" data-node-id="2111:2749" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector25} />
                              </div>
                              <div className="absolute inset-[27.44%_13.31%_67%_68.31%] mix-blend-multiply" data-node-id="2111:2750" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector26} />
                              </div>
                              <div className="absolute inset-[71.88%_14.89%_8.76%_67.48%]" data-node-id="2111:2751" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector27} />
                              </div>
                              <div className="absolute inset-[73.02%_3.23%_9.3%_79.44%] mix-blend-multiply" data-node-id="2111:2752" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector28} />
                              </div>
                              <div className="absolute inset-[81.81%_2.61%_6.32%_85.97%]" data-node-id="2111:2753" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector29} />
                              </div>
                              <div className="absolute inset-[87.77%_2.67%_6.32%_85.93%] mix-blend-multiply" data-node-id="2111:2754" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector30} />
                              </div>
                            </div>
                            <div className="absolute inset-[69.8%_3.82%_27.52%_95.21%] mix-blend-multiply" data-node-id="2111:2755" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector31} />
                            </div>
                            <div className="absolute contents inset-[49.1%_0.81%_34.65%_97.31%]" data-node-id="2111:2756" data-name="Group">
                              <div className="absolute inset-[49.22%_0.81%_34.65%_97.31%]" data-node-id="2111:2757" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector32} />
                              </div>
                              <div className="absolute inset-[49.1%_1.08%_34.77%_97.31%] mix-blend-multiply" data-node-id="2111:2758" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector33} />
                              </div>
                              <div className="absolute inset-[49.15%_0.84%_34.67%_97.31%] mix-blend-multiply" data-node-id="2111:2759" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector34} />
                              </div>
                            </div>
                            <div className="absolute contents inset-[70%_3.85%_27.82%_95.4%]" data-node-id="2111:2760" data-name="Group">
                              <div className="absolute inset-[70%_3.85%_27.82%_95.4%] mix-blend-multiply" data-node-id="2111:2761" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector35} />
                              </div>
                              <div className="absolute inset-[70.02%_3.88%_27.9%_95.43%]" data-node-id="2111:2762" data-name="Vector">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector36} />
                              </div>
                              <div className="absolute inset-[71.09%_3.88%_27.86%_95.43%] mix-blend-multiply" data-node-id="2111:2763" data-name="Group">
                                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup6} />
                              </div>
                            </div>
                            <div className="absolute inset-[70.41%_3.93%_28.3%_95.58%] mix-blend-multiply" data-node-id="2111:2765" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector37} />
                            </div>
                            <div className="absolute inset-[57.71%_1.17%_40.99%_98.35%] mix-blend-multiply" data-node-id="2111:2766" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector37} />
                            </div>
                            <div className="absolute inset-[57.94%_0_28.46%_95.61%]" data-node-id="2111:2767" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector38} />
                            </div>
                            <div className="absolute inset-[70.41%_1.05%_29.34%_95.75%] mix-blend-multiply" data-node-id="2111:2768" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector39} />
                            </div>
                          </div>
                          <div className="absolute contents inset-[23.51%_65.63%_56.71%_25.77%]" data-node-id="2111:2769" data-name="Group">
                            <div className="absolute inset-[23.51%_65.66%_56.73%_25.77%]" data-node-id="2111:2770" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector40} />
                            </div>
                            <div className="absolute inset-[23.85%_65.85%_58.52%_25.9%] mix-blend-screen" data-node-id="2111:2771" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector41} />
                            </div>
                            <div className="absolute inset-[25.34%_65.65%_56.73%_26.37%]" data-node-id="2111:2772" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector42} />
                            </div>
                            <div className="absolute inset-[23.51%_65.63%_70.28%_32.3%] mix-blend-multiply" data-node-id="2111:2773" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector43} />
                            </div>
                            <div className="absolute inset-[38.77%_72.11%_56.71%_25.77%] mix-blend-multiply" data-node-id="2111:2774" data-name="Vector">
                              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector44} />
                            </div>
                          </div>
                          <div className="absolute inset-[19.92%_63.16%_66.87%_31.77%]" data-node-id="2111:2775" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector45} />
                          </div>
                          <div className="absolute inset-[24.95%_63.14%_66.81%_33.68%] mix-blend-multiply" data-node-id="2111:2776" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector46} />
                          </div>
                          <div className="absolute inset-[19.29%_59.67%_45.26%_25.77%]" data-node-id="2111:2777" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector47} />
                          </div>
                          <div className="absolute inset-[45.07%_70.68%_45.25%_25.77%] mix-blend-multiply" data-node-id="2111:2778" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector48} />
                          </div>
                          <div className="absolute inset-[21.68%_59.88%_45.8%_26.5%] mix-blend-multiply" data-node-id="2111:2779" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector49} />
                          </div>
                          <div className="absolute inset-[20.8%_60.85%_48.27%_25.77%] mix-blend-screen" data-node-id="2111:2780" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector50} />
                          </div>
                          <div className="absolute inset-[19.24%_59.66%_74.16%_37.87%] mix-blend-multiply" data-node-id="2111:2781" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector51} />
                          </div>
                          <div className="absolute inset-[34.5%_71.65%_34.22%_8.14%]" data-node-id="2111:2782" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector52} />
                          </div>
                          <div className="absolute inset-[37.74%_72.33%_52.74%_23.7%]" data-node-id="2111:2783" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector53} />
                          </div>
                          <div className="absolute inset-[38.06%_72.76%_52.75%_23.72%]" data-node-id="2111:2784" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector54} />
                          </div>
                          <div className="absolute inset-[34.5%_71.68%_34.17%_8.13%]" data-node-id="2111:2785" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup15} />
                          </div>
                          <div className="absolute inset-[25.2%_65.53%_73.02%_33.5%]" data-node-id="2111:2788" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup8} />
                          </div>
                          <div className="absolute inset-[41.11%_73.16%_57.1%_25.88%]" data-node-id="2111:2791" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup9} />
                          </div>
                          <div className="absolute inset-[49.07%_71.2%_49.84%_28.21%]" data-node-id="2111:2794" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup10} />
                          </div>
                          <div className="absolute inset-[46.46%_72.03%_52.45%_27.38%]" data-node-id="2111:2797" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup16} />
                          </div>
                          <div className="absolute inset-[25.1%_60.58%_73.81%_38.82%]" data-node-id="2111:2800" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup12} />
                          </div>
                          <div className="absolute inset-[42.72%_73.05%_36.42%_12.66%]" data-node-id="2111:2803" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector55} />
                          </div>
                          <div className="absolute inset-[21.14%_66.01%_70.62%_31.94%] mix-blend-multiply" data-node-id="2111:2804" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector56} />
                          </div>
                          <div className="absolute inset-[14.14%_58.47%_72.65%_36.46%]" data-node-id="2111:2805" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector57} />
                          </div>
                          <div className="absolute inset-[19.38%_60.88%_78.83%_38.15%]" data-node-id="2111:2806" data-name="Group">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup13} />
                          </div>
                          <div className="absolute inset-[15.28%_61.1%_75.58%_36.61%] mix-blend-multiply" data-node-id="2111:2809" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector58} />
                          </div>
                          <div className="absolute inset-[69.58%_6.46%_15.2%_85.89%]" data-node-id="2111:2810" data-name="Vector">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector59} />
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] whitespace-nowrap" data-node-id="2111:2811">
                        Skip Loader
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex items-center px-[12px] py-[10px] relative shrink-0 w-full" data-node-id="2111:2812">
                <div className="flex flex-row items-center self-stretch" data-node-id="2111:2813">
                  <div className="content-stretch flex gap-[12px] h-full items-center relative shrink-0">
                    <CheckBox className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" property1="Not checked" />
                    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-node-id="2111:2815">
                      <div className="h-[16px] overflow-clip relative shrink-0 w-[33.488px]" data-node-id="2111:2816" data-name="Hook Loader">
                        <div className="absolute h-[16px] left-0 top-[-0.37px] w-[33.488px]" data-node-id="2111:2817" />
                        <div className="absolute h-[16.744px] left-[1.86px] top-[-0.74px] w-[29.758px]" data-node-id="2111:2818" data-name="Crane">
                          <div className="absolute flex inset-[0_0.01%_0_-0.01%] items-center justify-center" data-node-id="2111:2819" style={{ containerType: "size" }}>
                            <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                              <div className="relative size-full" data-name="Crane">
                                <div className="absolute contents inset-[21.09%_0_-0.21%_15.04%]" data-node-id="2111:2820" data-name="Layer 1">
                                  <div className="absolute inset-[21.09%_0_-0.21%_15.04%]" data-node-id="2111:2821" data-name="Group">
                                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup17} />
                                  </div>
                                </div>
                                <div className="absolute inset-[8.4%_23.51%_31.6%_52.65%]" data-node-id="2111:2843" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector60} />
                                </div>
                                <div className="absolute inset-[5.83%_1.21%_82.75%_28.92%]" data-node-id="2111:2844" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector61} />
                                </div>
                                <div className="absolute inset-[2.3%_71.07%_17.94%_-2.84%]" data-node-id="2111:2845">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup1261153433} />
                                </div>
                                <div className="absolute inset-[44.47%_0_34.65%_80.94%]" data-node-id="2111:2851" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector62} />
                                </div>
                                <div className="absolute inset-[39.68%_18.54%_33.28%_67.41%]" data-node-id="2111:2852" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector63} />
                                </div>
                                <div className="absolute inset-[66.72%_20.72%_31.78%_69.72%]" data-node-id="2111:2853" data-name="Vector">
                                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector64} />
                                </div>
                                <div className="absolute flex inset-[6.93%_0.01%_55.44%_89.9%] items-center justify-center" data-node-id="2111:2854" style={{ containerType: "size" }}>
                                  <div className="-rotate-90 flex-none h-[100cqw] w-[100cqh]">
                                    <div className="relative size-full" data-name="Vector">
                                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector65} />
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute flex inset-[18.31%_-7.53%_32.18%_79.67%] items-center justify-center" data-node-id="2111:2855" style={{ containerType: "size" }}>
                                  <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
                                    <div className="relative size-full" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-[44.19%_68.33%_39.53%_24.45%]" data-node-id="2111:2856" data-name="Vector">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector66} />
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Gilroy:Medium'] leading-[normal] not-italic relative shrink-0 text-[14px] text-[color:var(--base\/base-dark,black)] whitespace-nowrap" data-node-id="2111:2857">
                        Hook Loader
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white border-[#eaecf0] border-solid border-t content-stretch flex h-[72px] items-center justify-end p-[16px] relative shrink-0 w-full" data-node-id="2111:2858" data-name="Bottom panel">
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="2111:2859">
          <div className="content-stretch flex items-center justify-center px-[2px] relative shrink-0" data-node-id="2111:2860" data-name="Text padding">
            <p className="[word-break:break-word] font-['Gilroy:SemiBold'] leading-[20px] not-italic relative shrink-0 text-[#344054] text-[14px] whitespace-nowrap" data-node-id="2111:2861">
              Cancel
            </p>
          </div>
          <div className="bg-[var(--primary\/primary,#0072d6)] border border-[var(--primary\/primary,#0072d6)] border-solid content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[14px] py-[10px] relative rounded-[4px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] shrink-0" data-node-id="2111:2862" data-name="Buttons/Button">
            <div className="content-stretch flex items-center justify-center px-[2px] relative shrink-0" data-node-id="2111:2864" data-name="Text padding">
              <p className="[word-break:break-word] font-['Gilroy:SemiBold'] leading-[20px] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap" data-node-id="2111:2865">
                Add
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
SUPER CRITICAL: The generated React+Tailwind code MUST be converted to match the target project's technology stack and styling system.
1. Analyze the target codebase to identify: technology stack, styling approach, component patterns, and design tokens
2. Convert React syntax to the target framework/library
3. Transform all Tailwind classes to the target styling system while preserving exact visual design
4. Follow the project's existing patterns and conventions
DO NOT install any Tailwind as a dependency unless the user instructs you to do so.

Node ids have been added to the code as data attributes, e.g. `data-node-id="1:2"`.
These styles are contained in the design: Secondary Colors/Grey/700: #344054, Secondary Colors/Grey/300: #D0D5DD, Base/Black: #000000, Secondary Colors/Grey/400: #98A2B3, Base/White: #FFFFFF, Linear: , Gray/700: #344054, Shadows/shadow-xs: Effect(type: DROP_SHADOW, color: #1018280D, offset: (0, 1), radius: 2, spread: 0), Gray/200: #EAECF0, Shadow/Spreaded Shadow.: Effect(type: DROP_SHADOW, color: #00000014, offset: (0, 0), radius: 15, spread: 9).
Images and SVGs will be stored as constants, e.g. const image = `${assetPathPrefix}/<asset file name>`, where assetPathPrefix is declared once at the top of the code and every asset URL interpolates it. These constants will be used in the code as the source for the image, ex: <img src={image} />. Image assets are stored on a remote server for 7 days and can be fetched using the provided URLs until they expire.