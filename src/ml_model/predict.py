import random

def predict_single(data):
    # දැනට අපි ව්‍යාජ (mock) අගයක් ලබා දෙමු (0 = No Overtake, 1 = Overtake)
    # පසුව මෙතනට saved_model.pkl එක load කරලා නියම prediction එකක් ගන්න පුළුවන්.
    return random.choice([0, 1])