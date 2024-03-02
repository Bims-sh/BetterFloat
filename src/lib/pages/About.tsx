import { SettingsCard } from "~lib/components/SettingsCard";
import betterfloatLogo from "data-base64:~/../assets/icon.png";
import { Button, ScrollArea, TabsContent } from "../shadcn";
import csbluegemLogo from "data-base64:~/../assets/csbluegem.svg"
import { Spotlight } from "~lib/components/Spotlight";

export const About = () => {
    const words = [
        {
            text: "Our ",
        },
        {
            text: "Partners",
            className: "text-blue-500 dark:text-blue-500",
        },
    ];

    return (
        <TabsContent value="about" className="h-[530px] w-[330px]">
            <ScrollArea className="h-full w-full gap-2">
                <div className="h-full w-full rounded-md flex md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
                    <Spotlight
                        className="-top-28 left-0 md:left-60 md:-top-20 z-50"
                        fill="white"
                    />
                    <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-12 md:pt-0">
                        <div className="flex justify-center">
                            <img className="h-20" src={betterfloatLogo} />
                        </div>
                        <h1 className="pt-2 text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
                            BetterFloat
                        </h1>
                        <h2 className="pt-4 text-lg font-semibold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
                            open-source & <span className="text-blue-500 dark:text-blue-500">community</span>-driven
                        </h2>
                        <SettingsCard className="mt-4">
                            <div className="flex flex-col">
                                <h4 className="dark:text-white text-black font-medium text-base pb-2">Our Partners</h4>
                                <div className="flex gap-2 items-center">
                                    <Button variant="outline" className="flex flex-col h-fit" onClick={() => window.open('https://csbluegem.com/')}>
                                        <img className="h-6 w-6 rounded-lg" src={csbluegemLogo} />
                                        <p className="text-base font-normal">CSBlueGem</p>
                                    </Button>
                                    <Button variant="outline" className="h-fit">
                                        <p className="text-base font-normal">... more soon!</p>
                                    </Button>
                                </div>
                            </div>
                        </SettingsCard>
                    </div>
                </div>
                <footer className="absolute bottom-2 w-full text-center text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
                    <p>Built with 🖤 in Munich by <span className="cursor-pointer text-green-900" onClick={() => window.open('https://github.com/GODrums')}>Rums</span></p>
                </footer>
            </ScrollArea>
        </TabsContent>
    );
};