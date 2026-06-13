import json

with open("before.json", "r") as f:
    before_data = json.load(f)

with open("after.json", "r") as f:
    after_data = json.load(f)

for before, after in zip(before_data, after_data):
    if before["signals"] != after["signals"] or before["readinessTier"] != after["readinessTier"]:
        added_signals = set(after["signals"]) - set(before["signals"])
        removed_signals = set(before["signals"]) - set(after["signals"])
        
        print(f"File: {before['file']}")
        print(f"  Signals Before: {', '.join(before['signals']) or 'None'}")
        print(f"  Signals After:  {', '.join(after['signals']) or 'None'}")
        if added_signals:
            print(f"  + Added: {', '.join(added_signals)}")
        if removed_signals:
            print(f"  - Removed: {', '.join(removed_signals)}")
        print(f"  Readiness: {before['readinessTier']} ({before['readinessScore']}) -> {after['readinessTier']} ({after['readinessScore']})")
        print(f"  Opportunities: {len(before['opportunities'])} -> {len(after['opportunities'])}")
        print("-" * 40)
